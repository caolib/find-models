<script setup>
import { ref, watch } from 'vue'

// ponytail: 列表/供应商共用，暗色下缺图用首字母
const props = defineProps({
  id: { type: String, required: true },
  name: { type: String, default: '' },
  size: { type: Number, default: 28 },
})

const src = ref(null)

watch(
  () => props.id,
  (id) => {
    let alive = true
    src.value = null
    const p = window.services?.providerLogoPath?.(id)
    if (p) {
      src.value = 'file://' + p
      return () => {
        alive = false
      }
    }
    window.services?.getProviderLogo?.(id).then((f) => {
      if (alive && f) src.value = 'file://' + f
    })
    return () => {
      alive = false
    }
  },
  { immediate: true },
)
</script>

<template>
  <div
    :class="['logo-box', { ph: !src }]"
    :style="{
      width: size + 'px',
      height: size + 'px',
      fontSize: Math.max(10, Math.round(size * 0.42)) + 'px',
    }"
    aria-hidden="true"
  >
    <img v-if="src" :src="src" alt="" />
    <span v-else>{{ (name || id || '?').slice(0, 1).toUpperCase() }}</span>
  </div>
</template>
