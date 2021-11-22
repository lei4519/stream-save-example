<script setup lang="ts">
import { ref } from "@vue/reactivity";
import streamSaver from "streamsaver";
import { onMounted } from "vue";
const inputRef = ref<HTMLInputElement | null>(null);

onMounted(async () => {
  inputRef.value?.addEventListener("change", async (e: any) => {
    const files: FileList = e.target!.files;
    if (files.length === 0) return;
    const file = files[0];
    const reader = file.stream().getReader();
    const fileStream = streamSaver.createWriteStream(file.name);
    const stream = fileStream.getWriter();
    const pump: any = () =>
      reader
        .read()
        .then((res) =>
          res.done ? stream.close() : stream.write(res.value).then(pump)
        );

    pump();
  });
});
</script>


<template>
  <button @click="inputRef?.click()">saver.js 本地文件下载</button>
  <input ref="inputRef" multiple type="file" hidden />
</template>