import cookieParser from 'cookie-parser';
import express from 'express';
import {engine} from 'express-handlebars';
import passport from 'passport';
import path from 'path';
import {fileURLToPath} from 'url';
import cors from 'cors';

import {AlephStrategy} from '@natlibfi/passport-melinda-aleph';
import {MelindaJwtStrategy, verify, cookieExtractor} from '@natlibfi/passport-melinda-jwt';

import {createExpressLogger, createLogger} from '@natlibfi/melinda-backend-commons';
import {createStatusRouter, createMainViewRouter, createLogServiceRouter, createAuthRouter} from './routes/index.js';


//////////////////////////////////////////////////////////////////
// The unnamed default function creates server and returns it.
// The parameter is a set of environment variables

export async function startApp(configOptions) {
  const logger = createLogger();

  const {httpPort, enableProxy, melindaApiOptions, sharedPartialsLocation, sharedPublicLocation, sharedViewsLocation} = configOptions;

  // Auth login options
  const {xServiceURL, userLibrary, ownAuthzURL, ownAuthzApiKey, jwtOptions} = configOptions;

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  const server = await initExpress();

  // Soft shutdown function
  // if the event is "close", then server is closing itself
  server.on('close', () => {
    logger.info('Initiating soft shutdown of Melinda REST API');
    // Things that need soft shutdown
  });

  return server;

  //////////////////////////////////////////////////////////////////


  //----------------------------------------------------//
  // Defining the Express server

  // Add async when you need await in route construction
  async function initExpress() {

    //---------------------------------------------------//
    // Set the application as an Express app (function)

    const app = express();
    app.enable('trust proxy', enableProxy);


    //---------------------------------------------------//
    // Setup Alpeh authentication with passport
    logger.debug('Setting up auth');

    passport.use(new AlephStrategy({
      xServiceURL, userLibrary,
      ownAuthzURL, ownAuthzApiKey
    }));

    passport.use(new MelindaJwtStrategy({
      ...jwtOptions,
      secretOrKey: jwtOptions.secretOrPrivateKey,
      jwtFromRequest: cookieExtractor
    }, verify));

    app.use(passport.initialize());

    //---------------------------------------------------//
    // Setup Express Handlebars view engine
    logger.debug('Setting up handlebars');

    const handlebarsOptions = {
      extname: '.hbs',
      defaultLayout: 'default',
      layoutsDir: path.join(__dirname, 'views/layouts'),
      partialsDir: [
        {dir: path.join(__dirname, 'views/partials'), namespace: 'localPartials'},
        {dir: path.join(__dirname, sharedPartialsLocation), namespace: 'sharedPartials'}
      ],
      helpers: {
        shared(param) {
          return param.startsWith('/')
            ? `/shared${param}`
            : `sharedPartials/${param}`;
        }
      }
    };

    app.engine('.hbs', engine(handlebarsOptions));

    app.set('view engine', '.hbs');

    app.set('views', [
      path.join(__dirname, 'views'),
      path.join(__dirname, sharedViewsLocation)
    ]);


    //---------------------------------------------------//
    // Setup logging: use natlibfi helper

    app.use(createExpressLogger());
    app.use(cors());

    //---------------------------------------------------//
    // Setup Express built-in middleware function 'express.urlencoded'
    // Parses requests with urlencoded body
    // option extended is set as false:
    //    data is parsed with querystring library

    app.use(express.urlencoded({extended: false}));


    //---------------------------------------------------//
    // Setup Express built-in middleware function 'express.json'
    //  Parses requests with JSON payload

    app.use(express.json());
    app.use(cookieParser());

    //---------------------------------------------------//
    // Setup Express built-in middleware function 'express.static'
    // The directory where static assets are served from is given as argument.
    logger.debug('Setting up shared components');

    app.use('/shared', express.static(path.join(__dirname, sharedPublicLocation)));
    app.use('/scripts', express.static(path.join(__dirname, 'scripts')));
    app.use('/styles', express.static(path.join(__dirname, 'styles')));


    //---------------------------------------------------//
    // Setup Express Routers for these defined routes
    //   - require authentication to all but status route
    logger.debug('Setting up routes');

    app.use('/', createMainViewRouter(passport));
    app.use('/status', createStatusRouter());
    app.use('/logout', passport.authenticate('jwt', {session: false}), (req, res) => {
      res.redirect('/auth/logout');
    });
    app.use('/rest', createLogServiceRouter(melindaApiOptions));
    app.use('/auth', createAuthRouter(passport, jwtOptions));

    //---------------------------------------------------//
    // Setup handling for all other routes
    // When page is not found:
    //    -catch 404 and forward to error handler

    app.use(handlePageNotFound);


    //---------------------------------------------------//
    // Setup Express error handler

    app.use(handleError);


    //----------------------------------------------------//
    // Setup server to listen for connections on the specified port

    return app.listen(httpPort, () => {
      logger.log('info', `Started Melinda Viewer in port ${httpPort}`);
    });

    //---------------------------------------------------//
    //Middleware function to handle 404 pages

    function handlePageNotFound(req, res, next) {
      const {user} = req.oidc;

      logger.warn(`Error: it seems that this page is not found!`);
      logger.verbose(`Request method: ${req.method} | Path: ${req.path} | Query parameters: ${JSON.stringify(req.query)}`);

      const renderedView = 'pageNotFound';
      const localVariable = {title: 'Sivua ei löydy', username: user.name};

      res.status(404);
      res.render(renderedView, localVariable);
    }

    //---------------------------------------------------//
    //Middleware function to handle errors

    function handleError(err, req, res, next) {
      logger.info('APP: handleError');
      logger.error(err);

      // set locals, only providing error in development
      res.locals.message = err.message;
      res.locals.error = req.app.get('env') === 'development' ? err : {};

      // render the error page
      const renderedView = 'error';
      const localVariable = {title: 'Error | Viewer'};

      res.status(err.status || 500);
      res.render(renderedView, localVariable);
    }

  }
}
