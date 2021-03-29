'use strict';

exports.handler = (event, context, callback) => {
    console.log(event);

    const done = (err, res) => callback(null, {
        statusCode: err ? '400' : '200',
        body: err ? err.message : JSON.stringify(res),
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
        },
    });

    let init = () => {
        let obj = {
            name: 'object',
            action: 'hello',
        };

        done(null, obj);
    };

    init();
};