<template>
  <main>
    <h1>My Calendar</h1>
    <EventForm :eventId="editingEventId" @eventSubmitted="handleEventSubmitted" />

    <EventList ref="eventListRef" @editEvent="handleEditEvent" />
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue' // ref für den Template-Ref importieren
import EventList from '../components/EventList.vue'
import EventForm from '../components/EventForm.vue'

// Referenz auf die EventList-Komponente, um deren Methoden aufrufen zu können
const eventListRef = ref<InstanceType<typeof EventList> | null>(null)

// Reactive Variable zur Speicherung der ID des zu bearbeitenden Events
// Null bedeutet, dass ein neues Event erstellt wird
const editingEventId = ref<number | null>(null)

// Handler-Funktion, wenn ein Event erstellt ODER aktualisiert wurde
const handleEventSubmitted = () => {
  editingEventId.value = null // Formular zurücksetzen auf "neues Event erstellen" Modus
  eventListRef.value?.fetchEvents() // Event-Liste aktualisieren
}

// Handler-Funktion, wenn der Edit-Button in EventList geklickt wird
const handleEditEvent = (id: number) => {
  editingEventId.value = id // Setze die ID des zu bearbeitenden Events
  // Optional: Scrolle zum Formular, damit der Benutzer es sofort sieht
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
</script>
