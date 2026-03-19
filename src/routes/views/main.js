import {Router} from 'express';
import {createAuthHandler} from '../../middlewares.js';

//****************************************************************************//
//                                                                            //
// Main view router                                                           //
//                                                                            //
//****************************************************************************//


export function createMainViewRouter(passport) {
  const authHandler = createAuthHandler(passport);
  return new Router()
    .get('/', authHandler({failureRedirects: '/login'}), renderViewer)
    .get('/login', authHandler({successRedirects: '/', allowUnauthorized: true}), renderLogin);


  function renderViewer(req, res) {
    const renderedView = 'viewer';
    const username = req.user.displayName || req.user.id || 'melinda-user';
    const localVariable = {title: 'Viewer', username, onload: 'initialize()'};

    return res.render(renderedView, localVariable);
  }

  function renderLogin(req, res) {
    const renderedView = 'loginpage';
    const localVariable = {title: 'Kirjaudu | Viewer', isLogin: true, onload: 'initialize()'};
    return res.render(renderedView, localVariable);
  }
}
