import { z } from 'zod';

// Converte um schema zod (o mesmo que valida a rota) em JSON Schema para o
// OpenAPI. Datas viram string date-time: é assim que chegam no JSON.
export function zodToSchema(schema: z.ZodType): Record<string, unknown> {
  const jsonSchema: Record<string, unknown> = z.toJSONSchema(schema, {
    io: 'input',
    unrepresentable: 'any',
    override: (ctx) => {
      if (ctx.zodSchema._zod.def.type === 'date') {
        ctx.jsonSchema.type = 'string';
        ctx.jsonSchema.format = 'date-time';
      }
    },
  });
  // O $schema do JSON Schema não cabe dentro de um componente do OpenAPI.
  delete jsonSchema.$schema;
  return jsonSchema;
}
