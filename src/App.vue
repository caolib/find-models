<script setup>
import { onMounted, ref } from 'vue'
import Search from './Models/Search.vue'
import Detail from './Models/Detail.vue'
import Providers from './Models/Providers.vue'
import './Models/app.css'

const enterAction = ref({})
const tab = ref('search') // search | providers
const selected = ref(null)

onMounted(() => {
  // ponytail: dev 浏览器无 utools 注入，守卫一下避免崩；uTools 运行时才注册
  const u = window.utools
  if (!u) return
  u.onPluginEnter((action) => {
    enterAction.value = action
    selected.value = null
    // 划词/任意入口都进首页，默认搜索 tab
    tab.value = 'search'
  })
  u.onPluginOut(() => {
    enterAction.value = {}
    selected.value = null
  })
})

function select (row) {
  selected.value = row
}
function close () {
  selected.value = null
}
</script>

<template>
  <div class="app-shell">
    <div class="app-main">
      <div class="app-tabs">
        <button
          type="button"
          :class="['app-tab', { on: tab === 'search' }]"
          @click="tab = 'search'"
        >
          搜索
        </button>
        <button
          type="button"
          :class="['app-tab', { on: tab === 'providers' }]"
          @click="tab = 'providers'"
        >
          厂商
        </button>
      </div>
      <div class="app-panel">
        <Providers
          v-if="tab === 'providers'"
          :selected="selected"
          @select="select"
        />
        <Search
          v-else
          :enter-action="enterAction"
          :selected="selected"
          @select="select"
        />
      </div>
    </div>
    <aside v-if="selected" class="app-side">
      <Detail :row="selected" @close="close" />
    </aside>
  </div>
</template>
