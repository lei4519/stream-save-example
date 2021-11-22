#  `JS` 实现流式打包下载

本篇文章分析了在 `JS` 持有二进制数据时，如何进行**流式**的下载，主要参考了 [StreamSaver.js](https://github.com/jimmywarting/StreamSaver.js) 的实现方案。

分为如下部分：

1. 流在计算机中的作用
2. 服务器流式响应
3. `JS` 下载文件的方式
4. `JS` 持有数据并下载文件的场景
4. 现有打包方案痛点
5. 浏览器流式 `API`
6. `JS ` 流式的实现方案
7. 实现`JS`读取本地文件并打包下载

## 流在计算机中的作用

流这个概念在前端领域中提及的并不多，但是在计算机领域中，流式一个非常常见且重要的概念。

当**流**这个字出现在 IO 的上下文中，常指的得就是分段的读取和处理文件，这样在处理文件时（转换、传输），就不必把整个文件加载到内存中，大大的节省了内存空间的占用。

在实际点说就是，当你用着 `4G` 内存的 `iPhone 13`看电影时，并不需要担心视频文件数据把你的手机搞爆掉。

![Intro to File I/O](https://gitee.com/lei451927/picture/raw/master/images/io-ins.gif)

## 服务器流式响应

在谈下载之前，必须先提一下流式响应。

这也是本篇文章存在的意义：

- **流式的操作，必须整个链路都是流式的才有意义，一旦某个环节是非流式的，就无法起到节省内存的作用。**

  

如上节可知，当我们从服务器下载一个文件时，服务器也不可能把整个文件读取到内存中再进行响应，而是边读边响应。

那如何进行流式响应呢？

只需要设置一个响应头 `Transfer-Encoding: chunked`，表明我们的响应体是分块传输的就可以了。

以下是一个 `nodejs` 的极简实例，这个服务每隔一秒就会向浏览器进行一次响应，永不停歇。

```js
require('http').createServer((request, response) => {
    response.writeHead(200, {
        'Content-Type': 'text/html',
        'Transfer-Encoding': 'chunked'
    })

    setInterval(() => {
        response.write('chunked\r\n')
    }, 1000)
}).listen(8000);
```

当我们访问 `http://localhost:8000`时，就会如下图所示

![Nov-21-2021 12-43-04-min](/Users/lay/Downloads/chunked.gif)

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

不难看出，使用 `Ajax` 下载文件，最终还是要借助第一类方法才可以实现下载。

而第一类的操作都会导致一个行为：**页面级导航跳转**

所以我们可以总结得出浏览器的下载行为：

- 在**页面级的跳转请求**中，检查响应头是否包含 `Content-Disposition: attachment`。对于 `a[download]` 和 `createObjectURL`的 `url` 跳转，可以理解为浏览器帮忙加上了这个响应头。

- `Ajax` 发出的请求并不是页面级跳转请求，所以即使拥有下载响应头也不会触发下载行为。

  

### 两类下载方式的区别

这两种下载文件的方式有何区别呢？



第一类请求的响应数据直接由**下载线程**接管，可以进行流式下载，一边接收数据**一边往本地写文件**。

<img src="https://gitee.com/lei451927/picture/raw/master/images/C26743DD-25DF-4DF4-B08F-50B7A5B7032C.png" alt="C26743DD-25DF-4DF4-B08F-50B7A5B7032C" style="zoom:50%;" />

第二类由 `JS` 线程接管响应数据，使用 API 将文件数据创建成  `url` 触发下载。

<img src="https://gitee.com/lei451927/picture/raw/master/images/ADA43638-39F1-49D9-9204-BD2E688631C8.png" alt="ADA43638-39F1-49D9-9204-BD2E688631C8" style="zoom: 50%;" />

但是相应的 API `createObjectURL`、`readAsDataURL`**必须传入整个文件数据**才能进行下载，是不支持流的。也就是说一旦文件数据到了 `JS` 手中，想要下载，就必须把数据堆在内存中，直到拿到完整数据才能开始下载。



所以当我们从服务器下载文件时，应该尽量避免使用 `Ajax` ，直接使用 `页面跳转类`的 API 让下载线程进行流式下载。



但是有些场景下，我们需要在 `JS` 中处理数据，此时数据在 `JS` 线程中，就不得不面对内存的问题。



##`JS` 持有数据并下载文件的场景

以下场景，我们需要在 `JS` 中处理数据并进行文件下载。

1. 纯前端处理文件流：在线格式转换、解压缩等

   - 整个数据都在前端转换处理，压根没有服务端的事

2. 接口鉴权：鉴权方案导致请求必须由 `JS` 发起，如 `cookie + csrfToken`、`JWT`

   - 使用 `ajax` ：简单但是数据都在内存中
   - （推荐）使用 `iframe + form` 实现：麻烦但是可以由下载线程流式下载

3. 服务端返回文件数据，前端转换处理后下载

   - 如服务端返回多个文件，前端打包下载
- （推荐）去找后端聊 (gan) 一 (yi) 聊 (jia)

<img src="https://gitee.com/lei451927/picture/raw/master/images/image-20211121124612362.png" alt="image-20211121124612362" style="zoom: 25%;" />





可以看到第一种情况是必须用 `JS` 处理的，所以这也是我们接下来讨论的点：实现一个文件打包功能

## 现在打包方案痛点

去网上搜索「前端打包」，99% 的内容都会告诉你使用 `JSZip` ，谈起文件下载也都会提起一个 `file-saver`的库（`JSZip` 官网也推荐使用这个库下载文件）。

那我们就看一下这些流行库的的问题，以及流式下载的必要性。

```js
<script setup lang="ts">
import { onMounted, ref } from "@vue/runtime-core";
import JSZip from 'jszip'
import { saveAs } from 'file-saver'

const inputRef = ref<HTMLInputElement | null>(null);
onMounted(() => {
  inputRef.value?.addEventListener("change", async (e: any) => {
    const file = e.target!.files[0]!
    const zip = new JSZip();
    zip.file(file.name, file);
    const blob = await zip.generateAsync({type:"blob"})
    saveAs(blob, "example.zip");
  });
});
</script>

<template>
  <button @click="inputRef?.click()">JSZip 文件打包下载</button>
  <input ref="inputRef" type="file" hidden />
</template>
```

以上是一个用 `JSZip` 的官方实例构建的 `Vue` 应用，功能很简单，从本地上传一个文件，通过 `JSZip`打包，然后使用 `file-saver` 将其下载到本地。

我们来直接试一下，上传一个 `1G+` 的文件会怎么样？

<img src="https://gitee.com/lei451927/picture/raw/master/images/5B71C962-1262-4AF0-B340-832938A43117.png" alt="5B71C962-1262-4AF0-B340-832938A43117" style="zoom:50%;" />

通过 `Chrome` 的任务管理器可以看到，当前的页面内存直接跳到了 `1G+`。

当然有人可能会说，我有钱我的电脑是`1.5T`内存的，我不在乎~

<img src="https://gitee.com/lei451927/picture/raw/master/images/2C213F14-9283-4F33-9C1F-8A3648716248.png" alt="2C213F14-9283-4F33-9C1F-8A3648716248" style="zoom:33%;" />



ok，即使你的电脑足以支撑在内存中进行随意的数据转换，但浏览器对 `Blob` 对象是有大小限制的。

下面是 `file-saver` 的 `github`：

<img src="https://gitee.com/lei451927/picture/raw/master/images/7E828BBD-7D85-4821-AD12-42509F41869E.png" alt="7E828BBD-7D85-4821-AD12-42509F41869E" style="zoom: 40%;" />

官网的第一句话就是

> If you need to save really large files bigger than the blob's size limitation or don't have enough RAM, then have a look at the more advanced StreamSaver.js 
>
> 如果您需要保存比blob的大小限制更大的文件，或者没有足够的内存，那么可以查看更高级的 StreamSaver.js

然后给出了不同浏览器所支持的 `Max Blob Size`，可以看到 `Chrome` 是 `2G`。



所以不管是出于内存考虑，还是 `Max Blob Size`的限制，我们都有必要去探究一下流式的处理方案。



---

顺便说一下这个库并没有什么黑科技，它的下载方式和我们上面写的是一样的，只不过处理了一些兼容性问题。

下面是源码：

<img src="https://gitee.com/lei451927/picture/raw/master/images/35B1B723-5F36-4344-B708-5FFBEF4B0E96.png" alt="35B1B723-5F36-4344-B708-5FFBEF4B0E96" style="zoom:50%;" />

## 浏览器流式 `API`

前端流式读取

流式下载的前提是流式读取，这是必然的。

如果不能流式的读，那即便可以流式的下载也毫无意义，因为读阶段数据还是会堆在内存中。

反之亦然，可以流式读，不能流式下也是白搭（后面说）。



所幸浏览器是支持流式读取的，那就是 `ReadableStream` 接口。 

> [**ReadableStream**](https://developer.mozilla.org/zh-CN/docs/Web/API/ReadableStream)
>
> [流操作API](https://developer.mozilla.org/zh-CN/docs/Web/API/Streams_API) 中的`ReadableStream` 接口呈现了一个可读取的二进制流操作。[Fetch API](https://developer.mozilla.org/zh-CN/docs/Web/API/Fetch_API) 通过 [`Response`](https://developer.mozilla.org/zh-CN/docs/Web/API/Response) 的属性 [`body`](https://developer.mozilla.org/en-US/docs/Web/API/Response/body) 提供了一个具体的 `ReadableStream` 对象。



上面是 MDN 对  `ReadableStream` 接口的介绍，并且告诉了我们，`fetch` 请求返回的 `response.body` 就是一个 `ReadableStream` 对象。



### Fetch ReadableStream

fetch 请求流式的读取数据：

```js
const response = await fetch('/api/download')
// 获取可读流
const reader = response.body.getReader()

while(true) {
  // reader.read() 会阻塞的读取数据
  const {done, value} = await reader.read()
  // done 表示数据读完了
  if (done) break
  // value 是 Uint8Array 的二进制数组
  console.log(value)
}
```

调用 `reader.read()` 后会阻塞的读取数据，其返回值 `done` 表示数据已经读完，`value` 则是数据本身。

`while (true)` 的写法在其他语言中是非常常见的，如果数据没有读完，我们就重复调用 `read()` ，直到 `done` 为`true`。



### Blob ReadableStream

流式的读取本地文件：

```js
<input type="file" id="file">
  
document.getElementById("file")
  .addEventListener("change", async (e) => {
    const file: File = e.target.files[0];
  	// blob 的 stream() 会返回 ReadableStream
    const reader = file.stream().getReader();
  
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      console.log(value);
    }
	});
```

本地上传的文件属于 `File` 对象，`File` 对象继承自`Blob`对象。

`Blob` 的`stream`方法会返回一个 `ReadableStream` 对象，拿到`ReadableStream`对象后面的操作和上面就一样了。



---

总结：

- `ReadableStream` 接口提供了可读流的能力，`Response` 和 `File` 都提供了其实现。

## 前端流式下载

ok，解决了流式读取，终于到了流式下载部分。

这里我并不会推翻自己前面所说：

1. 只有页面级跳转会触发下载。

   - 这意味着数据在服务端

2.  `createObjectURL`、`readAsDataURL` 只能接收整个文件数据。

   - 这意味当数据在前端时，就只能整体下载

   

所以前端流式下载就是不可能喽？



### Service worker

主角登场 ~ 

是的，`Service worker`，熟悉 `PWA` 的人对它一定不陌生，它可以**拦截**浏览器的请求并**提供**离线缓存。

> [Service Worker API](https://developer.mozilla.org/zh-CN/docs/Web/API/Service_Worker_API)
>
> Service workers 本质上充当 Web 应用程序、浏览器与网络（可用时）之间的代理服务器。这个 API 旨在创建有效的离线体验，它会拦截网络请求并根据网络是否可用来采取适当的动作、更新来自服务器的的资源。
>
> —— MDN

这里有两个关键点：

1. 拦截请求
2. 构建响应

也就是说，通过 `Service worker` 前端完全可以自己充当服务器给下载线程发送数据。



让我们看看它是如何工作的

> `Service worker` 如何注册使用，请自行查阅，这里不会多说

### 拦截请求

```js
self.onfetch = event => {
	const url = event.request.url
	if (url === '拦截') {
      event.respondWith(new Response())
  }
}

```

请求的拦截非常简单，注册 `onfetch` 后，所有的请求发送都会触发其回调。

通过 `event.request` 对象拿到 `Request` 对象，进而检查 `url` 决定是否要拦截。

如果确定要拦截，就调用 `event.respondWith` 并传入 `Response` 对象。这样对于这个请求浏览器就会接收到的这个 `Response` 。

### new Response

函数签名：

```ts
declare var Response: {
    new(body?: BodyInit | null, init?: ResponseInit): Response;
};

type BodyInit = ReadableStream | Blob | BufferSource | FormData | URLSearchParams | string

interface ResponseInit {
    headers?: HeadersInit;
    status?: number;
    statusText?: string;
}
```

可以看到，`new Response` 时可以传入两个参数

1. 第一个是响应体 `Body`，其类型可以是 `Blob`、`string`等等，其中可以看到熟悉的 `ReadableStream`可读流
2. 第二个是响应头、状态码等

这意味着：

1. 将`Body` 构建成`ReadableStream`，我们就可以流式的向下载线程传输数据
2. 自定义响应头，把`Content-Disposition：attachment`写入响应头

也就意味着通过`Service worker` 前端可以进行流式下载！

### new ReadableStream

高兴之前再看一下如何构建 `ReadableStream`

```js
new ReadableStream({
  start(controller) {
    	// 关闭流，表示数据传送完了
      controller.close()
    	// 写入流，表示有数据了
      controller.enqueue(data)
  }
})
```

也非常简单，在 `start`函数中，我们可以接收到 `controller`, 调用 `controller.enqueue` 表示发送数据，调用 `close` 表示发送完成。



---

总结：

- `Service worker` 拦截请求，自定义响应触发下载线程的流式下载。



## 极简实现

我们将实现一个最简单的例子来将所有知识点串起来：

- 从本地上传文件，流式的读取，流式的下载到本地
- 是的这看似毫无意义，但这可以跑通流程，对学习来说足够了。

### 流程图

![image-20211121170425036](https://gitee.com/lei451927/picture/raw/master/images/image-20211121170425036.png)

### 重点分析

1. 主线程向 `Service worker` 发送消息，传入 `MessageChannel`，`MessageChannel` 是用来在两个流之间进行通信传输数据的。

   ```js
   const createDownloadStrean = async () => {
     const channel = new MessageChannel();
     // 发送消息，传入 channel
     serviceworker.postMessage('file.txt', [channel.port2]);
   
     await new Promise((r) => {
       channel.port1.onmessage = (e) => {
         // 拿到url, 发起请求
         if (e.data.download) { /* ... */ }
       };
     });
   
     return {
       write(chunk) {
         // 写入数据时，通过 channel 传递数据
         channel.port1.postMessage(chunk);
       },
       close() {
         channel.port1.postMessage("end");
       },
     };
   }
   ```

   

2. `Service worker` 创建并记录 `url`、`ReadableStream` ，`ReadableStream`内部会监听转发 `channel`传来的消息。

   ```js
   self.onmessage = (event) => {
     const data = event.data
     // 随机一个 url 
     const downloadUrl = self.registration.scope + Math.random() + '/' + data
     // channel
     const port = event.ports[0]
     // 创建 ReadableStream
     const stream = new ReadableStream({
       start(controller) {
         // 监听 port 的消息
         port.onmessage = ({ data }) => {
           if (data === 'end') {
             return controller.close()
           }
           controller.enqueue(data)
         }
       }
     })
   
     // 记录以做拦截
     map.set(downloadUrl, stream)
     // 回应 url
     port.postMessage({ download: downloadUrl })
   }
   ```

   

3. 主线程拿到 `url` 发起请求

   ```js
   channel.port1.onmessage = (e) => {
     // 拿到url, 发起请求
     if (e.data.download) {
       const iframe = document.createElement("iframe");
       iframe.hidden = true;
       iframe.src = e.data.download;
       iframe.name = "iframe";
       document.body.appendChild(iframe);
       r(undefined);
     }
   };
   ```

4. `Service worker` 拦截到`url` ，使用构建好的 `ReadableStream`创建`Response`并返回

   ```js
   self.onfetch = event => {
   	const url = event.request.url
   
   	const stream = map.get(url)
   	if (!stream) return null
   	map.delete(url)
   
   	const responseHeaders = new Headers({
   		'Content-Type': 'application/octet-stream; charset=utf-8',
       'Content-Disposition': 'attachment',
   		'Transfer-Encoding': 'chunked'
   	})
   
   	event.respondWith(new Response(stream, { headers: responseHeaders }))
   }
   ```

   

5. 下载线程拿到响应，开启流式下载（但是此时根本没有数据写入，所以在此就阻塞了）

6. 主线程拿到上传的 `File`对象，获取其`ReadableStream`并读取，将读取到的数据通过 `MessageChannel`发送出去。

   ```js
   
   input.addEventListener("change", async (e: any) => {
     const stream = createDownloadStrean()
     const file = e.target!.files[0];
     const reader = file.stream().getReader();
     while (true) {
       const { done, value } = await reader.read();
       if (done) {
         stream.close()
         break
       };
       stream.write(value)
     }
   });
   ```

7. 下载线程拿到的响应体 `ReadableStream` 中的 `channel` 监听到消息，就调用`controller.enqueue(data)`将数据写入（第二步的代码）

8. 下载线程接收到数据，开始下载



### 完整代码

- `index.js`

  ```js
  <script setup lang="ts">
  import { onMounted } from "@vue/runtime-core";
  
  async function register() {
    console.log("2: 注册 sw");
    // 已注册
    const registed = await navigator.serviceWorker.getRegistration("./");
    if (registed?.active) return registed.active;
  
    const swRegistration = await navigator.serviceWorker.register("sw.js", {
      scope: "./",
    });
  
    const sw = swRegistration.installing! || swRegistration.waiting!;
  
    let listen: any;
  
    return new Promise<ServiceWorker>((resolve) => {
      sw.addEventListener(
        "statechange",
        (listen = () => {
          if (sw.state === "activated") {
            sw.removeEventListener("statechange", listen);
            resolve(swRegistration.active!);
          }
        })
      );
    });
  }
  
  async function createDownloadStream(filename: string) {
    const channel = new MessageChannel();
    const streamSend = channel.port1;
    const streamReceive = channel.port2;
    const sw = await register();
  
    console.log("3: 向 sw 发送消息，拿到请求的 url");
    sw.postMessage(filename, [streamReceive]);
  
    await new Promise((r) => {
      streamSend.onmessage = (e) => {
        if (e.data.download) {
          console.log("5: 外部接到请求 url，生成 iframe 发起请求");
          const iframe = document.createElement("iframe");
          iframe.hidden = true;
          iframe.src = e.data.download;
          iframe.name = "iframe";
          document.body.appendChild(iframe);
          r(undefined);
        }
      };
    });
  
    return {
      write(chunk: Uint8Array) {
        console.log("7: 向流中写入数据");
        streamSend.postMessage(chunk);
      },
      close() {
        console.log("9: 下载完成");
        streamSend.postMessage("end");
      }
    };
  }
  
  
  onMounted(async () => {
    const input = document.querySelector("#file")!;
    input.addEventListener("change", async (e: any) => {
      console.log("1: 上传事件");
      const stream = await createDownloadStream('a.txt')
      const file = e.target!.files[0];
      const reader = file.stream().getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          stream.close()
          break
        };
        stream.write(value)
      }
    });
  });
  </script>
  
  <template>
    <input type="file" id="file" />
  </template>
  
  ```

- `sw.js`

  ```js
  /* global self ReadableStream Response */
  self.addEventListener('install', () => {
  	self.skipWaiting()
  })
  
  self.addEventListener('activate', event => {
  	event.waitUntil(self.clients.claim())
  })
  
  // 要拦截的请求 map
  const map = new Map()
  
  self.onmessage = event => {
  	console.log('4: sw 接到消息，生成请求 url 返回，同时将 url 记录以进行拦截')
  
  	const filename = event.data
  	const downloadUrl = self.registration.scope + Math.random() + '/' + filename
     // [stream, data]
  	const metadata = new Array(3)
  	const streamReceive = event.ports[0]
  
  	metadata[0] = new ReadableStream({
  		start(controller) {
  			port.onmessage = ({ data }) => {
  				if (data === 'end') {
  					return controller.close()
  				}
  				console.log("8: 接受到数据，向响应流中写入");
  				controller.enqueue(data)
  			}
  		}
  	})
    
  	metadata[1] = filename
  
  	map.set(downloadUrl, metadata)
  	streamReceive.postMessage({ download: downloadUrl })
  }
  
  self.onfetch = event => {
  	const url = event.request.url
  
  	const hijacke = map.get(url)
  
  	if (!hijacke) return null
  	console.log('6: 拦截到 url，创建流式响应返回。浏览器会根据 header 进行下载')
  	map.delete(url)
  
  	const [stream, filename] = hijacke
  
  
  	// Not comfortable letting any user control all headers
  	// so we only copy over the length & disposition
  	const responseHeaders = new Headers({
  		'Content-Type': 'application/octet-stream; charset=utf-8',
  		'Transfer-Encoding': 'chunked',
      'Content-Disposition': "attachment; filename*=UTF-8''" + filename
  	})
  
  	event.respondWith(new Response(stream, { headers: responseHeaders }))
  }
  
  ```

  

## 打包下载

跑通了流程之后，打包也就是顺手的事情了。

首先我们寻找一个可以流式打包的库（你肯定不想自己写一遍压缩算法），`fflate` 就是一个很火的打包库。

然后我们只需要在 `channel` 传输数据之前，将数据先给 `fflate` 处理就可以了

```js
onMounted(async () => {
  const input = document.querySelector("#file")!;
  input.addEventListener("change", async (e: any) => {
    const stream = createDownloadStrean()
    const file = e.target!.files[0];
    const reader = file.stream().getReader();
    
    const zip = new fflate.Zip((err, dat, final) => {
      if (!err) {
        fileStream.write(dat);
        if (final) {
          fileStream.close();
        }
      } else {
        fileStream.close();
      }
    });

    const helloTxt = new fflate.ZipDeflate("hello.txt", { level: 9 });
    zip.add(helloTxt);

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        zip.end();
        break
      };
      helloTxt.push(value)
    }
  });
}); 

```

是的，就是这么简单！

这里有一份完整的代码，实现了本地多文件打包和服务器多文件打包，感兴趣的可以克隆跑起来看看



## 参考资料

- [StreamSaver.js](https://github.com/jimmywarting/StreamSaver.js)
- [MDN](https://developer.mozilla.org/zh-CN/)

