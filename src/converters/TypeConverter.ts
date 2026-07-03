export interface TypeConverter {

    toCodeValue(
        value: any,
        type: string
    ): string;

    serializerCode(): string;
}