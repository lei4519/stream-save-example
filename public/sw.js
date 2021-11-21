/* global self ReadableStream Response */

self.addEventListener('install', () => {
	self.skipWaiting()
})

self.addEventListener('activate', event => {
	event.waitUntil(self.clients.claim())
})

const map = new Map()

self.onmessage = event => {
	const data = event.data
	const downloadUrl = self.registration.scope + Math.random() + '/' + data.filename
	const streamReceive = event.ports[0]

	const stream = createStream(streamReceive)

	map.set(downloadUrl, [stream, data])
	streamReceive.postMessage({ download: downloadUrl })
}

function createStream(port) {
	return new ReadableStream({
		start(controller) {
			port.onmessage = ({ data }) => {
				if (data === 'end') {
					return controller.close()
				}
				if (data === 'abort') {
					controller.error('Aborted the download')
					return
				}
				controller.enqueue(data)
			}
		},
		cancel() {
			console.log('user aborted')
		}
	})
}

self.onfetch = event => {
	const url = event.request.url

	const hijacke = map.get(url)

	if (!hijacke) return null
	map.delete(url)

	const [stream, data] = hijacke
	// Make filename RFC5987 compatible
	const fileName = encodeURIComponent(data.filename).replace(/['()]/g, escape).replace(/\*/g, '%2A')
	const responseHeaders = new Headers({
		'Content-Type': 'application/octet-stream; charset=utf-8',
		'Transfer-Encoding': 'chunked',
		'response-content-disposition': 'attachment',
		'Content-Disposition': "attachment; filename*=UTF-8''" + fileName
	})

	event.respondWith(new Response(stream, { headers: responseHeaders }))
}
