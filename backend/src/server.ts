import Koa from 'koa';
import json from 'koa-json';
import logger from 'koa-logger';
import {router} from './routes';
import {config} from './config';

const app = new Koa();

app.use(json({pretty: config.isDevelopment}));

if (config.isDevelopment) {
    app.use(logger());
}

app.use(router.middleware());

app.listen(config.port, () => {
    console.log(`App started at http://localhost:${config.port}`);
});
