<script setup lang="ts">
import LocalFileDownload from "./components/LocalFileDownload.vue";
import LocalFileZip from "./components/LocalFileZip.vue";
import JSZip from "./components/JSZip.vue";
</script>

<template>
  <JSZip />
  <LocalFileDownload />
  <LocalFileZip />
</template>

<style>
button {
  display: block;
  margin: 20px auto 0;
}
</style>