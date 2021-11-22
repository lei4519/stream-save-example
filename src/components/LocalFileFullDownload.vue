<script setup lang="ts">
import { onMounted, ref } from "@vue/runtime-core";

const inputRef = ref<HTMLInputElement | null>(null);

onMounted(async () => {
  inputRef.value?.addEventListener("change", async (e: any) => {
    const files: FileList = e.target!.files;
    if (files.length === 0) return;

    const file = files.item(0)!;
    const reader = new FileReader()
    reader.readAsDataURL(file)

    // const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    a.click();
  });
});
</script>

<template>
  <button @click="inputRef?.click()">本地普通文件下载</button>
  <input ref="inputRef" type="file" hidden />
</template>
