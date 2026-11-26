import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { openApiSpec } from './openapi';

const docsRoutes = Router();

// O JSON vem antes da tela: a Swagger UI responde a qualquer caminho em /docs.
docsRoutes.get('/docs/openapi.json', (_req, res) => {
  res.json(openApiSpec);
});
docsRoutes.use(
  '/docs',
  swaggerUi.serve,
  swaggerUi.setup(openApiSpec, {
    customSiteTitle: 'Planejamento Financeiro API',
  }),
);

export default docsRoutes;
