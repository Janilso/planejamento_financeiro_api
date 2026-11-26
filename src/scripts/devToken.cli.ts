import { generateDevToken } from './devToken';

// Uso: npm run token:dev -- <userId>
const userId = process.argv[2] ?? 'usuario-dev';
console.log(generateDevToken(userId));
