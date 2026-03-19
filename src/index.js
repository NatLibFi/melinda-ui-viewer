// All exportables from config.js are named here as config.
import * as config from './config.js';

// importing some helpers from melinda-backend-commons
import {createLogger, handleInterrupt} from '@natlibfi/melinda-backend-commons';

// importing the express app
import {startApp} from './app.js';


/////////////////////////////////////////////////
// Calling the function run starts the application

run();

/////////////////////////////////////////////////


//----------------------------------------------------//
// function run
//    -registers the interruption handlers and
//    -calls startApp
//        * startApp is given the environment variables from config.js

async function run() {

  const logger = createLogger();

  registerInterruptionHandlers();

  await startApp(config);


  //----------------------------------------------------//
  // registerInterruptionHandlers()
  //    - checks if node process is considered as an interruption
  //    - and then handles it.
  // Uses "process" which is a global variable in node,
  // that holds the NodeJS.Process (information of current node process).
  // Built-in node function process.on(event, listener) is used
  // to handle different situations.
  //    - SIGTERM is for program termination (asking politely)
  //    - SIGINT happens when user interrupts program (ctrl+c)
  //          * handleInterrupt always exits on 1

  function registerInterruptionHandlers() {
    process
      .on('SIGTERM', handleSignal)
      .on('SIGINT', handleInterrupt)
      .on('uncaughtException', ({stack}) => {
        handleTermination({code: 1, message: stack});
      })
      .on('unhandledRejection', ({stack}) => {
        handleTermination({code: 1, message: stack});
      });
  }


  //----------------------------------------------------//
  // Forward the received signal as message with exit code 1
  // to function handleTermination

  function handleSignal(signal) {
    handleTermination({code: 1, message: `Received ${signal}`});
  }


  //----------------------------------------------------//
  // process.exit() takes a single argument as an integer.
  //    - If the argument is 0, it represents a successful exit state.
  //    - If it's greater than that, it indicates that an error occurred
  //        * 1 is a common exit code for failures here

  function handleTermination({code = 0, message = false}) {
    logMessage(message);
    process.exit(code);
  }


  //----------------------------------------------------//
  // If there is a message, log it as error

  function logMessage(message) {
    if (message) {
      return logger.error(message);
    }
  }


}
