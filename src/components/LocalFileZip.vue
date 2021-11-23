<script setup lang="ts">
import { onMounted, ref } from "@vue/runtime-core";
import * as fflate from "fflate";
import { createDownloadStream } from "../utils/common";

const inputRef = ref<HTMLInputElement | null>(null);

const concatUnit8Array = (chunks: Uint8Array[]) => {
  const len = chunks.reduce((len, { length }) => len + length, 0);
  const mergeArr = new Uint8Array(len);
  chunks.reduce((offset, chunk) => {
    mergeArr.set(chunk, offset);
    return offset + chunk.length;
  }, 0);
  return mergeArr
};

// 缓存一此宏任务中的数据
const bufferMacroTaskChunk = (cb: (chunk: Uint8Array) => any) => {
  const chunks: Uint8Array[] = [];
  let flag = false;
  return (chunk: Uint8Array) => {
    chunks.push(chunk);
    if (!flag) {
      flag = true;
      setTimeout(() => {
        console.log("bufferMacroTask run");
        flag = false;
        const mergeArr = concatUnit8Array(chunks)
        chunks.length = 0;
        cb(mergeArr);
      });
    }
  };
};

onMounted(async () => {
  inputRef.value?.addEventListener("change", async (e: any) => {
    const files: FileList = e.target!.files;
    if (files.length === 0) return;

    const stream = (await createDownloadStream("LocalFileZip.zip")).getWriter();

    const buffer = bufferMacroTaskChunk((chunk) => {
      stream.write(chunk).then(() => {
        iterator.next();
      });
    });
    const zip = new fflate.Zip((err, data, final) => {
      if (err || final) {
        stream.close();
        console.log("end");
      } else {
        console.log("pull", data);
        buffer(data);
      }
    });

    const streamList: Array<[ReadableStreamDefaultReader, fflate.ZipDeflate]> =
      [];
    for (let i = 0; i < files.length; i++) {
      const file = files.item(i)!;
      const zipStream = new fflate.ZipDeflate(file.name, {
        level: 5,
      });
      streamList.push([file.stream().getReader(), zipStream]);
      zip.add(zipStream);
    }
    async function* read() {
      for (let i = 0; i < streamList.length; i++) {
        const [reader, zipStream] = streamList[i];
        while (true) {
          console.log("read");
          const { done, value = new Uint8Array() } = await reader.read();
          console.log("push", i, done);
          zipStream.push(value, done);
          console.log("yield");
          yield;
          console.log("next");
          if (done) break;
        }
      }
      zip.end();
    }
    const iterator = read();
    console.log("start");
    iterator.next();
  });
});
</script>

<template>
  <button @click="inputRef?.click()">流式 文件压缩</button>
  <input ref="inputRef" multiple type="file" hidden />
</template>
