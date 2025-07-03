<template>
  <main>
    <h1>My Calendar</h1>

    <EventForm
      ref="eventFormRef"
      :eventId="editingEventId"
      @eventSubmitted="handleEventSubmitted"
      @cancelEdit="handleCancelEdit"
    />

    <EventList ref="eventListRef" @editEvent="handleEditEvent" />
  </main>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import EventList from '../components/EventList.vue'
import EventForm from '../components/EventForm.vue'

/**
 * @module HomeView
 * @description
 * Die Hauptansicht der Anwendung, die das Event-Formular und die Event-Liste integriert.
 * Verwaltet den Bearbeitungsmodus für Events und orchestriert die Datenaktualisierung
 * zwischen dem Formular und der Liste.
 */

/**
 * @interface EventListExposed
 * @description Definiert die Typen der Methoden, die von `EventList.vue` über `defineExpose` verfügbar gemacht werden.
 * Dies wird benötigt, um `eventListRef.value?.fetchEvents()` typensicher aufrufen zu können.
 */
interface EventListExposed {
  fetchEvents: () => Promise<void>
}

/**
 * @interface EventFormExposed
 * @description Definiert die Typen der Methoden, die von `EventForm.vue` über `defineExpose` verfügbar gemacht werden.
 * Dies wird benötigt, um `eventFormRef.value?.resetAndLoad()` typensicher aufrufen zu können.
 */
interface EventFormExposed {
  resetAndLoad: (id: number | null) => void
}

/**
 * @property {EventListExposed | null} eventListRef
 * @description Ein Ref, um direkten Zugriff auf die `EventList`-Komponente und ihre exponierten Methoden zu erhalten.
 * Wird verwendet, um die Event-Liste nach Änderungen (Hinzufügen, Bearbeiten, Löschen)
 * neu zu laden.
 */
const eventListRef = ref<EventListExposed | null>(null)

/**
 * @property {EventFormExposed | null} eventFormRef
 * @description Ein Ref, um direkten Zugriff auf die `EventForm`-Komponente und ihre exponierten Methoden zu erhalten.
 * Wird verwendet, um das Formular explizit zurückzusetzen oder ein Event zu laden,
 * insbesondere zur Behebung des "Cancel Edit"-Verhaltens.
 */
const eventFormRef = ref<EventFormExposed | null>(null)

/**
 * @property {number | null} editingEventId
 * @description Speichert die ID des aktuell zu bearbeitenden Events.
 * - `null`, wenn ein neues Event hinzugefügt wird oder kein Event bearbeitet wird.
 * - Eine `number` (Event-ID), wenn ein Event bearbeitet wird.
 * Dieser Wert wird an die EventForm-Komponente als Prop übergeben.
 */
const editingEventId = ref<number | null>(null)

/**
 * @function handleEventSubmitted
 * @description
 * Wird ausgelöst, wenn die EventForm-Komponente ein Event erfolgreich hinzugefügt oder aktualisiert hat.
 * Setzt den Bearbeitungsmodus zurück und löst ein Neuladen der Event-Liste aus.
 * Anschließend wird das Formular explizit geleert.
 * @async
 * @returns {Promise<void>}
 */
const handleEventSubmitted = async () => {
  console.log('HomeView: Event erfolgreich übermittelt. Setze Bearbeitungsmodus zurück.')
  editingEventId.value = null // Bearbeitungsmodus beenden
  await eventListRef.value?.fetchEvents() // Event-Liste aktualisieren
  eventFormRef.value?.resetAndLoad(null) // Formular explizit leeren
}

/**
 * @function handleEditEvent
 * @description
 * Wird ausgelöst, wenn der "Edit"-Button bei einem Event in der EventList geklickt wird.
 * Setzt die `editingEventId` auf die ID des zu bearbeitenden Events, um das Formular zu füllen.
 * Implementiert eine `nextTick`-Strategie, um das zuverlässige Neuladen des Formulars zu gewährleisten,
 * auch wenn dasselbe Event nach einem "Cancel" erneut ausgewählt wird.
 * @async
 * @param {number} id - Die ID des zu bearbeitenden Events.
 * @returns {Promise<void>}
 */
const handleEditEvent = async (id: number) => {
  console.log('HomeView: Bearbeiten-Signal für Event ID:', id)

  // Schritt 1: Den Bearbeitungsmodus vorübergehend beenden und das Formular leeren.
  // Dies ist entscheidend, damit der `watch`-Hook in EventForm zuverlässig
  // auf die anschließende Änderung der ID reagiert (von null zu ID).
  editingEventId.value = null
  eventFormRef.value?.resetAndLoad(null) // explizit Formular leeren

  // Schritt 2: nextTick() warten. Dies stellt sicher, dass Vue alle DOM-Updates,
  // die sich aus der Änderung von `editingEventId` zu `null` ergeben, abgeschlossen hat.
  // Erst danach setzen wir die neue ID.
  await nextTick()

  // Schritt 3: Die Event-ID setzen, um den Bearbeitungsmodus zu aktivieren.
  editingEventId.value = id
  // Schritt 4: Das Formular explizit anweisen, das Event mit der neuen ID zu laden.
  eventFormRef.value?.resetAndLoad(id)

  // Zum Formular scrollen, damit der Benutzer es sofort sieht
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

/**
 * @function handleCancelEdit
 * @description
 * Wird ausgelöst, wenn der "Cancel Edit"-Button in der EventForm-Komponente geklickt wird.
 * Setzt den Bearbeitungsmodus zurück, was das EventForm dazu veranlasst, sich zu leeren.
 * @returns {void}
 */
const handleCancelEdit = () => {
  console.log('HomeView: Bearbeitung abgebrochen. Setze Bearbeitungsmodus zurück.')
  editingEventId.value = null // Bearbeitungsmodus beenden (Formular sollte sich leeren)
  eventFormRef.value?.resetAndLoad(null) // Formular explizit leeren
}
</script>

<style scoped>
/* Standard-Styling für die Hauptseite */
main {
  padding: 20px;
  font-family: Arial, sans-serif;
  background-color: #f4f4f4;
  min-height: 100vh;
}

h1 {
  text-align: center;
  color: #333;
  margin-bottom: 30px;
  font-size: 2.5em;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.1);
}
</style>
