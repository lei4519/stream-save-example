---
marp: false
---

#  JS 流式下载 —— [StreamSaver.js](https://github.com/jimmywarting/StreamSaver.js)

---

## 流的作用

分段的读取和处理文件，不必把整个文件加载到内存中，节省内存空间的占用。

### 流式的操作，必须整个链路都是流式的才有意义
### 一旦某个环节是非流式（阻塞）的，就无法起到节省内存的作用。


![Intro to File I/O](https://gitee.com/lei451927/picture/raw/master/images/io-ins.gif)

---

## 服务器流式响应

从服务器下载一个文件时，服务器也不可能把整个文件读取到内存中再进行响应，而是会边读边响应。

### 响应头 `Transfer-Encoding: chunked`，表明响应体是分块传输的。

```js
require('http').createServer((request, response) => {
    response.writeHead(200, {
        'Content-Type': 'text/html',
        'Transfer-Encoding': 'chunked'
    })

    setInterval(() => {
        response.write('chunked\r\n')
    }, 1000)
}).listen(9000);
```

---

访问 `http://localhost:9000`时，如下所示

![](stream-serve.gif)

---

## `JS` 下载文件的方式

在 `js` 中下载文件的方式，有如下两类：

```js
// 第一类：页面跳转、打开
location.href
window.open
iframe.src
a[download].click()

// 第二类：Ajax
fetch('/api/download')
	.then(res => res.blob())
	.then(blob => {
    // FileReader.readAsDataURL()
    const url = URL.createObjectURL(blob)
    // 借助第一类方式：location.href、iframe.src、a[download].click()
    window.open(url)
  })
```

第一类的操作都会导致一个行为：**页面级导航跳转**

---

## 浏览器下载行为

- 在**页面级的跳转请求**中，检查响应头是否包含 `Content-Disposition: attachment`。对于 `a[download]` 和 `createObjectURL`的 `url` 跳转，可以理解为浏览器帮忙加上了这个响应头。

- `Ajax` 发出的请求并不是页面级跳转请求，所以即使拥有下载响应头也不会触发下载行为。

---

## 这两种下载文件的方式有何区别呢？

第一类请求的响应数据直接由**下载线程**接管，可以进行流式下载，一边接收数据**一边往本地写文件**。

![](https://gitee.com/lei451927/picture/raw/master/images/C26743DD-25DF-4DF4-B08F-50B7A5B7032C.png)

第二类由 `JS` 线程接管响应数据，使用 API 将文件数据创建成  `url` 触发下载。`createObjectURL`、`readAsDataURL`**必须传入整个文件数据**才能创建 URL。

![](https://gitee.com/lei451927/picture/raw/master/images/ADA43638-39F1-49D9-9204-BD2E688631C8.png)

---

## `JS` 持有数据并下载文件的场景

1. 纯前端处理文件流：在线格式转换、解压缩等
   - 整个数据都在前端转换处理，压根没有服务端的事（要讨论的情况）

2. 接口鉴权：鉴权方案导致请求必须由 `JS` 发起，如 `cookie + csrfToken`、`JWT`
   - 使用 `ajax` ：简单但是数据都在内存中
   - （推荐）使用 `iframe + form` 实现：麻烦但是可以由下载线程流式下载

3. 服务端返回文件数据，前端转换处理后下载
   - 如服务端返回多个文件，前端打包下载
   - （推荐）去找后端聊 ~~聊一聊~~

---

![](https://gitee.com/lei451927/picture/raw/master/images/image-20211121124612362.png)

---

## 非流式处理、下载的问题

网上搜索「前端 zip」，得到的答案大概率是 `JSZip` 。

```js
import JSZip from 'jszip'
import { saveAs } from 'file-saver'

inputRef.value?.addEventListener("change", async (e: any) => {
  const file = e.target!.files[0]!
  const zip = new JSZip();
  zip.file(file.name, file);
  const blob = await zip.generateAsync({type:"blob"})
  saveAs(blob, "example.zip");
});
```

---

![contain](https://gitee.com/lei451927/picture/raw/master/images/5B71C962-1262-4AF0-B340-832938A43117.png)

---

![](https://gitee.com/lei451927/picture/raw/master/images/35B1B723-5F36-4344-B708-5FFBEF4B0E96.png)

---

## Max Blob Size

`FileSaver` 官网的第一句话就是

> If you need to save really large files bigger than the blob's size limitation or don't have enough RAM, then have a look at the more advanced StreamSaver.js
>
> 如果您需要保存比blob的大小限制更大的文件，或者没有足够的内存，那么可以查看更高级的 StreamSaver.js

---

![bg contain](https://gitee.com/lei451927/picture/raw/master/images/7E828BBD-7D85-4821-AD12-42509F41869E.png)

---

## 浏览器流式 `API`

---

![contain](https://gitee.com/lei451927/picture/raw/master/images/image-20211123110312433.png)

---

## [WritableStream](https://developer.mozilla.org/en-US/docs/Web/API/WritableStream)

创建一个可写流对象，这个对象带有内置的背压和排队。

```js
// 创建
const writableStream = new WritableStream({
  write(chunk: Unit8Array) {
    console.log(chunk)
  }
})
// 使用
const writer = writableStream.getWriter()
writer.write(1).then(() => {
  // 应当在 then 再写入下一个数据
  writer.write(2)
})
```

---

## [ReadableStream](https://developer.mozilla.org/zh-CN/docs/Web/API/ReadableStream)

创建一个可读的二进制操作。

```js
const readableStream = new ReadableStream({
  start(controller) {
    setInterval(() => {
      // 向流中放入数据
      controller.enqueue(value);
      // controller.close(); 表明数据已发完
    }, 1000)
  }
});

async function () {
  const reader = readableStream.getReader()
  while (true) {
    const {value, done} = await reader.read()
    console.log(value)
    if (done) break
  }
}
```

---

## Fetch ReadableStream

> [Fetch API](https://developer.mozilla.org/zh-CN/docs/Web/API/Fetch_API) 通过 [`Response`](https://developer.mozilla.org/zh-CN/docs/Web/API/Response) 的属性 [`body`](https://developer.mozilla.org/en-US/docs/Web/API/Response/body) 提供了一个具体的 `ReadableStream` 对象。

```js
const response = await fetch('/api/download')

response.json = async () => {
  const reader = response.body.getReader()
  const chunks = []
  while(true) {
    const {done, value} = await reader.read()
    if (done) break
    chunks.push(value)
  }
  return JSON.parse(toString(chunks))
}
```

---

## Blob ReadableStream

`Blob` 对象的 `stream` 方法，会返回一个 `ReadableStream`。

当我们从本地上传文件时，文件对象 `File` 就是继承自`Blob`

```js
fileInput.addEventListener("change", async (e) => {
  const file: File = e.target.files[0];

  const reader = file.stream().getReader();
  while (true) {
    const { done, value } = await reader.read();
    console.log(value);
    if (done) break;
  }
});
```

---

## 转换流

一端转换写入数据、一端读取数据。
```js
const { port1, port2 } = new MessageChannel()

const writableStream = new WritableStream({
  write(chunk) {
    port1.postMessage(chunk)
  }
})

const readableStream = new ReadableStream({
  start(controller) {
    port2.onmessage = ({ data }) => {
      controller.enqueue(data)
    }
  }
});

const writer = writableStream.getWriter()
writer.write(123) // 写入数据

const reader = readableStream.getReader()
reader.read() // 读出数据 123
```

---

## [TransformStream](https://developer.mozilla.org/en-US/docs/Web/API/TransformStream)

```js
const {readable, writable} = new TransformStream()

writable.getWriter().write(123) // 写入数据

readable.getReader().read() // 读出数据 123
```

#
#
#
#

---

## 流式下载

前面的结论：

1. 只有页面级跳转会触发下载。

    - 这意味着发起请求后，响应数据直接被下载线程接管，`JS` 没机会插手处理。

2.  `Fetch` 请求，前端可以处理数据，但`createObjectURL`只能接收整个文件数据。

    - 这意味一旦数据到了`JS`手中，只能整体下载。

---

## [Service Worker API](https://developer.mozilla.org/zh-CN/docs/Web/API/Service_Worker_API)

熟悉 `PWA` 的人对它一定不陌生，它可以**拦截**浏览器的请求并**提供**离线缓存。

这里有两个关键点：

1. 拦截请求
2. 构建响应

#

通过 `Service worker` 前端完全可以自己充当服务器给下载线程传输数据。

---

## 拦截请求

```js
self.onfetch = event => {

  const { url } = event.request

  if (url === '要拦截 url') {

    event.respondWith(new Response())

  }
}
```

---

## new Response

`fetch()`返回的 `response` 的构造函数。

```ts
interface Response: {
    new(body?: BodyInit, init?: ResponseInit): Response
}

type BodyInit = ReadableStream | Blob | BufferSource | FormData | URLSearchParams | string

interface ResponseInit {
    headers?: HeadersInit
    // ...
}
```

---
这意味着：

1. 在响应头中写入`Content-Disposition：attachment`，浏览器就会让下载线程接管响应。
2. 将`Body` 构建成 `ReadableStream`，就可以流式的向下载线程传输数据。

```js
const header = new Headers({
  'Content-Disposition': "attachment;"
})

const {readable, writable} = new TransformStream()

new Response(readable, { header })
```

也意味着前端可以进行流式下载！

---

## 极简实现

我们构建一个最简的例子来将所有知识点串起来：从本地上传文件，流式的读取，流式的下载到本地。

---

![cover](https://gitee.com/lei451927/picture/raw/master/images/image-20211123143409710.png)

---


1. 通知 `service worker` 准备下载文件，等待 `worker` 返回 `url` 和`writable`

```js
const createDownloadStrean = async (filename) => {
  // 通过 channel 接受数据
  const { port1, port2 } = new MessageChannel();

  // 传递 channel，这样 worker 就可以往回发送消息了
  serviceworker.postMessage({ filename }, [port2]);

  return new Promise((resolve) => {
    port1.onmessage = ({data}) => {
      // 拿到url, 发起请求
      const iframe = document.createElement('iframe')
      iframe.src = data.url;
      document.body.appendChild(iframe);
      // 返回可写流
      resolve(data.writable)
    };
  });
}
```

---

2. `Service worker` 接受到消息，创建 `url`、`ReadableStream` 、`WritableStream`，将 `url`、`WritableStream`通过 `channel` 发送回去。

```js
self.onmessage = (event) => {
  const filename = event.data.filename
  // 拿到 channel
  const port2 = event.ports[0]
  // 随机一个 url
  const downloadUrl = self.registration.scope + Math.random() + '/' + filename
  // 创建转换流
  const { readable, writable } = new TransformStream()
  // 记录 url 和可读流，用于后续拦截和响应构建
  map.set(downloadUrl, readable)
  // 传回 url 和可写流
  port2.postMessage({ download: downloadUrl, writable }, [writable])
}
```
---

3. 主线程拿到 `url` 发起请求（第 1 步 `onmessage`中），`Service worker` 拦截请求 ，使用上一步的 `ReadableStream`创建`Response`并响应。

```js
self.onfetch = event => {
  const url = event.request.url
    // 从 map 中取出流，存在表示这个请求是需要拦截的
  const readableStream = map.get(url)
  if (!readableStream) return null
  map.delete(url)

  const headers = new Headers({
    'Content-Type': 'application/octet-stream; charset=utf-8',
    'Content-Disposition': 'attachment'
  })
  // 构建返回响应
  event.respondWith(
    new Response(readableStream, { headers })
  )
}
```

---

4. 主线程拿到上传的 `File`对象，获取其`ReadableStream`并读取，将读取到的数据通过 `WritableStream`（第 1 步中返回的）发送出去。

```js
input.addEventListener("change", async (e: any) => {
  const file = e.target!.files[0];
  const writableStream = createDownloadStrean()

  const reader = file.stream().getReader();
  const writable = writableStream.getWriter()

  const pump = async () => {
    const { done, value } = await reader.read();
    if (done) return writable.close()
    await writable.write(value)
    // 递归调用，直到读取完成
    return pump()
  };
  pump();
})
```

---

## 流式压缩下载

```js
const writableStream = createDownloadStrean()
const writable = writableStream.getWriter()
const file = e.target!.files[0];
const reader = file.stream().getReader();

const zip = new fflate.Zip();
const zipStream = new fflate.ZipDeflate(file.name, { level: 9 });
zip.add(zipStream);

zip.ondata = (err, data, final) => {
  if (err || final) {
    zip.end();
    writable.close();
  } else {
    writable.write(data);
  }
}

while (true) {
  const { done, value = new Unit8Array } = await reader.read();
  zipStream.push(value, done)
}
```

---

## 完整代码、文章
## https://github.com/lei4519/stream-save-example

