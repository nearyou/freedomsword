import app from '../src/application';

const port = Number(process.env.PORT ?? 3001);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');
const host = process.env.HOST ?? '0.0.0.0';
app.listen(port, host, () => console.info(`FreedomSword API listening on ${host}:${port}`));
