<script setup lang="ts">
import { onMounted, ref } from "@vue/runtime-core";
import { createDownloadStream } from "../utils/common";

const inputRef = ref<HTMLInputElement | null>(null);

onMounted(async () => {
  inputRef.value?.addEventListener("change", async (e: any) => {
    const files: FileList = e.target!.files;
    if (files.length === 0) return;

    const file = files.item(0)!;
    const reader = file.stream().getReader();

    const writableStream = await createDownloadStream(file.name);
    const writable = writableStream.getWriter();

    const pump = async () => {
      console.log('读取本地文件数据')
      const { done, value } = await reader.read();
      if (done) return writable.close()
      console.log('向下载线程写入数据')
      await writable.write(value)
      pump()
    };

    pump();
  });
});
</script>

<template>
  <button @click="inputRef?.click()">本地流式文件下载</button>
  <input ref="inputRef" type="file" hidden />
</template>
