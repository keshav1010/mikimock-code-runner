# Code runner on one dedicated EC2 host

Run the Node service directly on a patched Linux host with local Docker Engine. Use a supported Node 22 or 24 LTS release. Do not expose Docker's API or the runner publicly. Allow TCP 9090 only from the backend's ECS security group. The runner needs no AWS credentials or application database credentials.

## Install and verify a release

Assume the reviewed repository is installed at `/opt/mikimock-code-runner`, a dedicated `runner` user exists, and Docker Engine is installed and running. Membership of the Docker group is effectively host-root access; reserve that user exclusively for this service. Use one runner process per host, with no overlapping rolling processes: startup reconciliation removes previous execution containers carrying `mikimock.runner.managed=true`.

```sh
cd /opt/mikimock-code-runner
npm ci
npm audit
npm run build
npm test
docker pull eclipse-temurin:21-jdk
docker pull gcc:13
docker pull python:3.11-slim
docker pull node:22-slim
RUN_DOCKER_TESTS=1 node --test tests/docker.test.cjs
```

Run Docker commands as the dedicated service user (or grant it Docker access beforehand). Test on the same EC2 architecture as production. Execution uses `--pull never`; startup checks all four images, so missing images fail startup. Record image digests per release and patch/retest them regularly. For immutable releases, replace the fixed image references in `src/executor.ts` with reviewed digests and rebuild.

Four active sandboxes can use up to 1 GiB of container memory plus the Node service, daemon, OS, and image cache. Start capacity testing on a non-burstable host with at least four vCPUs and sufficient RAM/headroom; size from measured compilation latency, not daily user counts. A queue of 32 is a burst buffer, not extra execution capacity.

## Environment

Copy variable names/defaults from `.env.example` into a root-owned `/etc/mikimock-runner.env`. Set `RUNNER_SECRET` to a strong random value shared only with Spring Boot's `CODE_RUNNER_SECRET`, using a secure editor or secret provisioning process. Keep this file mode 0600. Do not place secrets on a command line, in Git, or in logs.

| Variable | Default | Meaning |
|---|---:|---|
| RUNNER_SECRET | none; required | Shared authentication secret; missing/blank prevents startup |
| PORT | 9090 | HTTP port |
| MAX_CONCURRENT_EXECUTIONS | 4 | Active requests including wrapper generation, execution and cleanup |
| MAX_QUEUE_SIZE | 32 | Maximum waiting requests; zero disables waiting |
| QUEUE_TIMEOUT_MS | 30000 | Maximum wait before execution starts |
| MAX_CODE_BYTES | 100000 | UTF-8 source limit |
| MAX_INPUT_BYTES | 50000 | Per-test custom input/expected-output limit |
| MAX_TEST_CASES | 1000 | Maximum submitted test count |

JSON bodies remain capped at 200 KiB, so individual configurable limits do not override that total. Compressed request bodies are rejected. Source/input limits, supported metadata, unique test identifiers and nesting are validated before queue admission. Overload and expired waits return HTTP 503 with `Retry-After: 5`. Authentication failures return 401; invalid requests 400; oversized JSON 413. Valid run/submit response fields are preserved. Containers retain a combined 20000-byte stdout/stderr limit; exceeding it returns `EXECUTION_FAILED` with `Output limit exceeded`.

## Supervise with systemd

Example `/etc/systemd/system/mikimock-runner.service` (review paths for the installed host):

```ini
[Unit]
Description=MikiMock Code Runner
Requires=docker.service
After=network-online.target docker.service
Wants=network-online.target

[Service]
Type=simple
User=runner
Group=runner
SupplementaryGroups=docker
WorkingDirectory=/opt/mikimock-code-runner
Environment=NODE_ENV=production
EnvironmentFile=/etc/mikimock-runner.env
ExecStart=/usr/bin/node /opt/mikimock-code-runner/dist/server.js
Restart=on-failure
RestartSec=5
TimeoutStopSec=50
KillMode=mixed
NoNewPrivileges=true
PrivateTmp=false
UMask=0077
LimitCORE=0

[Install]
WantedBy=multi-user.target
```

Use `PrivateTmp=false`: the Node process and Docker daemon must see the same host source directory. Confirm `/usr/bin/node` is the supported installed binary. Do not enable service filesystem restrictions that hide its temporary files from Docker.

```sh
sudo systemctl daemon-reload
sudo systemctl enable --now mikimock-runner
curl --fail http://127.0.0.1:9090/health
sudo journalctl -u mikimock-runner -n 100 --no-pager
```

`GET /health` is lightweight process/queue health, with startup Docker/image checks and a latched failure after cleanup problems. It is not a live Docker daemon probe. Monitor health, 503 rates, queue depth, host memory/disk/inodes, daemon state, and labelled stale containers. Rotate journald logs. SIGTERM/SIGINT reject queued jobs, stop admission and drain active jobs; a 45-second deadline ends stuck shutdown. Startup reconciles labelled containers and `job-*` folders under the dedicated temporary root. SIGKILL/power loss cannot provide immediate cleanup; restart the service promptly. Do not run tests against a host with live production jobs.

## Spring Boot integration

Set `CODE_RUNNER_URL=http://<runner-private-address>:9090`, without `/api/v1`, and match `CODE_RUNNER_SECRET` to `RUNNER_SECRET`. No request-field or DTO change is required. Use private DNS if the instance address may change.

The backend currently stores `code.runner.timeout-ms` but does not apply it to its plain `RestTemplate`. Configure finite connect/read timeouts. Allow a response budget greater than the 30-second queue wait plus 20-second outer execution and up to 10-second cleanup (for example 65 seconds), aligning proxy/frontend timeouts too. Handle 503 as temporary overload and 400/413 as invalid requests; avoid automatic retries while an execution may still be in progress. Remove submitted source/test payloads from backend error logs. For stronger transport protection use private TLS/mTLS or equivalent internal protection; security groups alone do not encrypt the secret.

## Remaining limitations

- Docker shares the host kernel; it is not a VM-grade sandbox. Keep the host dedicated, patch Docker/kernel/images, retain default seccomp/AppArmor, and consider stronger sandbox runtimes later.
- The sandbox has no network, UID/GID 65534, no capabilities, read-only root/source and bounded tmpfs storage. `/app` must allow executable binaries for C++; `/tmp` remains noexec. No host Docker socket or credentials are mounted inside executions.
- The runner service's Docker-group membership remains a privileged host boundary. No extra EC2 application credentials should be present.
- User code shares a process with the grading wrapper and can inspect embedded tests or forge result events. Deduplicating events prevents count inflation but does not make grading tamper-proof. Do not use these results as authoritative high-stakes assessment until a separate trusted grading design exists.
- Existing class extraction is not a language parser; braces in strings/comments and import placement can break otherwise valid code. Existing void/output-parameter support and cross-language serialization precision/control-character handling need targeted catalog fixtures. Wrapper/converter algorithms were retained.
- Client disconnects cancel waiting work. Already active work finishes within bounded time and cleanup; it is not immediately canceled.
- Current status classification uses stderr heuristics; exit 137 can mean more than OOM. Response timing fields in the existing wrapper result parsers remain zero.
