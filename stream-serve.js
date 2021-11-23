require('http').createServer((request, response) => {
    response.writeHead(200, {
        'Content-Type': 'text/html',
        'Transfer-Encoding': 'chunked',
    })

    setInterval(() => {
        response.write('chunked\r\n')
    }, 1000)

}).listen(8009);

console.log('Server running at http://127.0.0.1:8009/');// var http = require('http');

// const gen = (count) => {
//     let t = ''
//     while (count--) {
//         t += '1'
//     }
//     return t
// }

// const repeat = (count, s, f, done) => {
//     timer = setInterval(() => {
//         count--
//         if (count <= 0) {
//             done()
//         } else {
//             f()
//         }
//     }, s)
// }

// http.createServer((request, response) => {
//     response.writeHead(200, {
//         'Content-Type': 'text/html',
//         'Transfer-Encoding': 'chunked'
//     })

//     repeat(100, 10,
//         () => {
//             response.write(gen(1024 * 1000));
//         },
//         () => {
//             response.end(`done`);
//         }
//     )
// }).listen(8000);
