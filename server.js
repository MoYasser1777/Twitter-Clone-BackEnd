const http = require('http');
const dotenv = require('dotenv');

process.on('uncaughtException', (err) => {
    console.log('uncaught exception'.toUpperCase(), ',Shutting down......');
    console.log(err.name, err.message);
    process.exit(1);
});

dotenv.config({ path: './.env' });
const PORT = process.env.PORT || 2000;

const app = require('./app');
const { AppDataSource } = require('./DB/dataSource');

let server;
(async () => {
    try {
        await AppDataSource.initialize();
        if (AppDataSource.isInitialized) {
            console.log('DB connection established ✔️');
            server = http.createServer(app).listen(PORT, () => {
                console.log(`Express server listening on port ${PORT} 🫡`);
            });
        }
    } catch (err) {
        console.log(err.name, err.message);
        process.exit(1);
    }
})();

process.on('unhandledRejection', (err) => {
    console.log('Unhandled Rejection'.toUpperCase(), ',Shutting down....');
    console.log(err.name, err.message);
    server.close(() => {
        process.exit(1);
    });
});
