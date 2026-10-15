import app from '../src/application';

const port = Number(process.env.PORT ?? 3001);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');
app.listen(port, () => console.info(`FreedomSword API listening on port ${port}`));
