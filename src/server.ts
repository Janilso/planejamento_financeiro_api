import app from './app';
import { connectDB, environment } from './config';
import { docsUrl } from './docs/docsUrl';

connectDB();
app.listen(environment.port, () => {
  console.log(`Servidor na porta ${environment.port}`);
  console.log(`Swagger: ${docsUrl(environment.port)}`);
});
