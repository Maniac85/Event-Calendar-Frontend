<template>
  <main>
    <h1>My Calendar</h1>
    <EventForm @eventCreated="handleEventCreated" />
    <EventList ref="eventListRef" />
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue' // ref für den Template-Ref importieren
import EventList from '../components/EventList.vue'
import EventForm from '../components/EventForm.vue'

// 1. Erstelle einen Template-Ref, um auf die EventList-Komponenteninstanz zuzugreifen
const eventListRef = ref<InstanceType<typeof EventList> | null>(null)

// 2. Callback-Funktion, die aufgerufen wird, wenn 'eventCreated' emittiert wird
const handleEventCreated = () => {
  // 3. Wenn die EventList-Instanz verfügbar ist, rufe fetchEvents auf
  if (eventListRef.value) {
    eventListRef.value.fetchEvents()
  }
}
</script>
