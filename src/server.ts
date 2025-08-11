import app from './app';
import { connectDB, environment } from './config';

connectDB();
app.listen(environment.port, () => {
  console.log(`Server running on port ${environment.port}`);
});
