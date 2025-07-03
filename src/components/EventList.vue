<template>
  <div class="event-list-container">
    <h2>Events</h2>

    <div class="filters">
      <h3>Filter Events</h3>
      <div class="form-group">
        <label for="filterTitle">Filter by Title:</label>
        <input
          type="text"
          id="filterTitle"
          v-model="filterParams.title"
          @input="debouncedFetchEvents"
          placeholder="e.g. Meeting, Task"
          title="Enter part of the event title to filter"
        />
      </div>
      <div class="form-group">
        <label for="filterDescription">Filter by Description:</label>
        <input
          type="text"
          id="filterDescription"
          v-model="filterParams.description"
          @input="debouncedFetchEvents"
          placeholder="e.g. important, deadline"
          title="Enter part of the event description to filter"
        />
      </div>
      <div class="form-group">
        <label for="filterStartDate">Starts On or After:</label>
        <input
          type="date"
          id="filterStartDate"
          v-model="filterParams.startDate"
          @change="fetchEvents"
          title="Filter events starting on or after this date"
        />
      </div>
      <div class="form-group">
        <label for="filterEndDate">Ends On or Before:</label>
        <input
          type="date"
          id="filterEndDate"
          v-model="filterParams.endDate"
          @change="fetchEvents"
          title="Filter events ending on or before this date"
        />
      </div>
      <div class="form-group checkbox-group">
        <input
          type="checkbox"
          id="filterCompleted"
          v-model="filterParams.isCompleted"
          @change="fetchEvents"
          title="Show only events marked as completed"
        />
        <label for="filterCompleted">Show Completed Events</label>
      </div>
      <div class="form-group checkbox-group">
        <input
          type="checkbox"
          id="filterIncomplete"
          v-model="filterParams.isIncomplete"
          @change="fetchEvents"
          title="Show only events marked as incomplete"
        />
        <label for="filterIncomplete">Show Incomplete Events</label>
      </div>
      <button
        @click="resetFilters"
        class="reset-button"
        title="Clear all filters and show all events"
      >
        Reset Filters
      </button>
    </div>

    <ul class="event-list">
      <li v-for="event in events" :key="event.id" class="event-item">
        <div class="event-details">
          <input
            type="checkbox"
            :id="`event-completed-${event.id}`"
            v-model="event.isCompleted"
            @change="toggleCompletion(event)"
            class="completion-checkbox"
            :title="event.isCompleted ? 'Mark as Incomplete' : 'Mark as Completed'"
          />
          <div :class="{ completed: event.isCompleted }">
            <h3>{{ event.title }}</h3>
            <p><strong>Description:</strong> {{ event.description }}</p>
            <p><strong>Start:</strong> {{ new Date(event.startDateTime).toLocaleString() }}</p>
            <p><strong>End:</strong> {{ new Date(event.endDateTime).toLocaleString() }}</p>
            <p class="status-text">
              Status:
              <span :class="event.isCompleted ? 'status-completed' : 'status-incomplete'">
                {{ event.isCompleted ? 'Completed' : 'Incomplete' }}
              </span>
            </p>
          </div>
        </div>
        <div class="event-actions">
          <button @click="onEditEvent(event.id)" class="edit-button">Edit</button>
          <button @click="confirmDelete(event.id, event.title)" class="delete-button">
            Delete
          </button>
        </div>
      </li>
    </ul>
    <p v-if="events.length === 0" class="no-events-message">No events found.</p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, defineExpose } from 'vue'

/**
 * @module EventList
 * @description
 * Komponente zur Anzeige einer Liste von Events, inklusive Filter- und Bearbeitungsoptionen.
 * Ruft Event-Daten vom Backend ab und ermöglicht das Löschen oder Ändern des Abschlussstatus.
 */

/**
 * @interface Event
 * @description Definition der Struktur eines Event-Objekts.
 * @property {number} id - Die eindeutige ID des Events.
 * @property {string} title - Der Titel des Events.
 * @property {string} description - Die Beschreibung des Events.
 * @property {string} startDateTime - Das Startdatum und die Startzeit des Events (ISO 8601 Format).
 * @property {string} endDateTime - Das Enddatum und die Endzeit des Events (ISO 8601 Format).
 * @property {boolean} isCompleted - Zeigt an, ob das Event abgeschlossen ist.
 */
interface Event {
  id: number
  title: string
  description: string
  startDateTime: string
  endDateTime: string
  isCompleted: boolean
}

/**
 * @interface EventListEmits
 * @description Definition der Emits, die diese Komponente an die Elternkomponente sendet.
 * @property {(id: number) => void} editEvent - Wird ausgelöst, wenn der "Edit"-Button bei einem Event geklickt wird.
 * Übergibt die ID des zu bearbeitenden Events.
 */
interface EventListEmits {
  (e: 'editEvent', id: number): void
}
const emits = defineEmits<EventListEmits>()

/**
 * @property {ref<Event[]>} events
 * @description Eine reaktive Referenz auf das Array von Event-Objekten, das in der Liste angezeigt wird.
 */
const events = ref<Event[]>([])

/**
 * @interface FilterParams
 * @description Definition der Struktur des Filterparameter-Objekts.
 * @property {string} title - Filter nach Event-Titel (Teilstring).
 * @property {string} description - Filter nach Event-Beschreibung (Teilstring).
 * @property {string} startDate - Filter für Events, die an oder nach diesem Datum beginnen (FormatYYYY-MM-DD).
 * @property {string} endDate - Filter für Events, die an oder vor diesem Datum enden (FormatYYYY-MM-DD).
 * @property {boolean} isCompleted - Wenn `true`, werden nur abgeschlossene Events angezeigt.
 * @property {boolean} isIncomplete - Wenn `true`, werden nur unvollständige Events angezeigt.
 */
interface FilterParams {
  title: string
  description: string
  startDate: string
  endDate: string
  isCompleted: boolean
  isIncomplete: boolean
}
const filterParams = ref<FilterParams>({
  title: '',
  description: '',
  startDate: '',
  endDate: '',
  isCompleted: false,
  isIncomplete: false,
})

/**
 * @property {ReturnType<typeof setTimeout> | null} debounceTimer
 * @description Ein Timer für die Entprellung der Input-Ereignisse, um nicht bei jedem Tastendruck
 * einen neuen API-Aufruf zu senden.
 */
let debounceTimer: ReturnType<typeof setTimeout> | null = null

/**
 * @function debouncedFetchEvents
 * @description Eine entprellte Version von `fetchEvents`. Wartet 300ms nach der letzten Eingabe,
 * bevor `fetchEvents` aufgerufen wird, um unnötige API-Aufrufe zu vermeiden.
 * @returns {void}
 */
const debouncedFetchEvents = () => {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }
  debounceTimer = setTimeout(() => {
    fetchEvents()
  }, 300)
}

/**
 * @function fetchEvents
 * @description Ruft die Event-Daten vom Backend ab, unter Berücksichtigung der aktuellen Filterparameter.
 * Aktualisiert das `events`-Array.
 * @async
 * @returns {Promise<void>}
 */
const fetchEvents = async () => {
  console.log('EventList: Starte Abrufen der Events...')
  try {
    const backendUrl = import.meta.env.VITE_APP_API_BASE_URL || 'http://localhost:8080'
    const queryParams = new URLSearchParams()

    // Filter-Parameter zu den Query-Parametern hinzufügen, falls vorhanden und nicht leer
    if (filterParams.value.title) {
      queryParams.append('title', filterParams.value.title)
    }
    if (filterParams.value.description) {
      queryParams.append('description', filterParams.value.description)
    }
    if (filterParams.value.startDate) {
      queryParams.append('startDate', filterParams.value.startDate)
    }
    if (filterParams.value.endDate) {
      queryParams.append('endDate', filterParams.value.endDate)
    }

    // Logik für isCompleted/isIncomplete Filter:
    // Wenn isCompleted UND NICHT isIncomplete ausgewählt ist, filtere nach completed=true
    if (filterParams.value.isCompleted && !filterParams.value.isIncomplete) {
      queryParams.append('isCompleted', 'true')
    }
    // Wenn isIncomplete UND NICHT isCompleted ausgewählt ist, filtere nach completed=false
    else if (!filterParams.value.isCompleted && filterParams.value.isIncomplete) {
      queryParams.append('isCompleted', 'false')
    }
    // Wenn beide oder keine ausgewählt sind, wird isCompleted nicht als Filter gesendet.

    const url = `${backendUrl}/events?${queryParams.toString()}`
    console.log('EventList: Abruf-URL:', url)

    const response = await fetch(url)

    if (!response.ok) {
      console.error('EventList: HTTP-Fehler beim Abrufen!', response.status)
      alert(`Error fetching events: ${response.status}`)
      return
    }
    const data = await response.json()
    events.value = data as Event[] // Abgerufene Daten dem reaktiven Array zuweisen
    console.log('EventList: Events erfolgreich abgerufen:', events.value.length)
  } catch (error) {
    console.error('EventList: Fehler beim Abrufen der Events:', error)
    alert('Network error or unable to connect to backend.')
  }
}

/**
 * @function resetFilters
 * @description Setzt alle Filterparameter auf ihre Standardwerte zurück und lädt die Events neu.
 * @returns {void}
 */
const resetFilters = () => {
  console.log('EventList: Filter zurückgesetzt.')
  filterParams.value = {
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    isCompleted: false,
    isIncomplete: false,
  }
  fetchEvents()
}

/**
 * @function toggleCompletion
 * @description Schaltet den `isCompleted`-Status eines Events um und aktualisiert ihn im Backend.
 * @async
 * @param {Event} event - Das Event-Objekt, dessen Status geändert werden soll.
 * @returns {Promise<void>}
 */
const toggleCompletion = async (event: Event) => {
  console.log('EventList: Umschalten des Abschlussstatus für Event ID:', event.id)
  try {
    const backendUrl = import.meta.env.VITE_APP_API_BASE_URL || 'http://localhost:8080'
    const url = `${backendUrl}/events/${event.id}/complete?isCompleted=${event.isCompleted}`
    const response = await fetch(url, {
      method: 'PATCH', // PATCH für partielle Aktualisierung
      headers: {
        'Content-Type': 'application/json',
      },
      // Bei PATCH wird hier oft kein Body gesendet, da der Status in der URL ist
    })

    if (!response.ok) {
      const errorText = await response.text()
      // Bei Fehler den Status in der UI zurückrollen
      event.isCompleted = !event.isCompleted
      alert(`Failed to update completion status: ${response.status} - ${errorText}`)
      console.error(
        'EventList: Fehler beim Aktualisieren des Abschlussstatus:',
        response.status,
        errorText,
      )
    } else {
      console.log(`Event ${event.id} Abschlussstatus aktualisiert auf ${event.isCompleted}`)
      // Optional: fetchEvents() aufrufen, wenn Sie sicherstellen wollen, dass die Liste
      // sofort alle Filter korrekt anwendet, falls sich der Status geändert hat.
      // fetchEvents();
    }
  } catch (error) {
    event.isCompleted = !event.isCompleted // Rollback bei Netzwerkfehler
    console.error('EventList: Netzwerkfehler beim Umschalten des Abschlussstatus:', error)
    alert('Network error or unable to connect to backend when toggling completion.')
  }
}

/**
 * @function confirmDelete
 * @description Fordert eine Bestätigung vor dem Löschen eines Events an.
 * @param {number} id - Die ID des zu löschenden Events.
 * @param {string} title - Der Titel des zu löschenden Events (für die Bestätigungsnachricht).
 * @returns {void}
 */
const confirmDelete = async (id: number, title: string) => {
  if (confirm(`Are you sure you want to delete the event "${title}" (ID: ${id})?`)) {
    await deleteEvent(id)
  }
}

/**
 * @function deleteEvent
 * @description Löscht ein Event vom Backend.
 * @async
 * @param {number} id - Die ID des zu löschenden Events.
 * @returns {Promise<void>}
 */
const deleteEvent = async (id: number) => {
  console.log('EventList: Lösche Event mit ID:', id)
  try {
    const backendUrl = import.meta.env.VITE_APP_API_BASE_URL || 'http://localhost:8080'
    const url = `${backendUrl}/events/${id}`

    const response = await fetch(url, {
      method: 'DELETE',
    })

    if (response.ok) {
      console.log(`Event mit ID ${id} erfolgreich gelöscht.`)
      await fetchEvents() // Liste nach dem Löschen aktualisieren
    } else {
      const errorText = await response.text()
      console.error(
        `EventList: Fehler beim Löschen von Event ID ${id}: ${response.status} - ${errorText}`,
      )
      alert(`Failed to delete event: ${response.status} - ${errorText}`)
    }
  } catch (error) {
    console.error('EventList: Netzwerkfehler beim Löschen:', error)
    alert('Network error or unable to connect to backend.')
  }
}

/**
 * @function onEditEvent
 * @description Wrapper-Funktion, die das `editEvent`-Signal an die Elternkomponente emittiert.
 * Wird explizit für die IDE-Erkennung verwendet.
 * @param {number} id - Die ID des Events, das bearbeitet werden soll.
 * @returns {void}
 */
const onEditEvent = (id: number) => {
  console.log('EventList: Emittiere "editEvent" für Event ID:', id)
  emits('editEvent', id)
}

/**
 * @description
 * Beobachtet die `isCompleted` und `isIncomplete` Filter-Checkboxen.
 * Wenn beide gleichzeitig ausgewählt werden, werden sie zurückgesetzt,
 * um eine logisch widersprüchliche Filterung zu vermeiden.
 */
watch(
  [() => filterParams.value.isCompleted, () => filterParams.value.isIncomplete],
  ([newCompleted, newIncomplete]) => {
    if (newCompleted && newIncomplete) {
      console.warn('EventList: Beide Abschlussfilter wurden ausgewählt, setze beide zurück.')
      filterParams.value.isCompleted = false
      filterParams.value.isIncomplete = false
    }
  },
)

/**
 * @lifecycle onMounted
 * @description Lifecycle-Hook: Wird aufgerufen, nachdem die Komponente gemountet wurde.
 * Ruft die Events beim initialen Laden der Komponente ab.
 */
onMounted(fetchEvents)

/**
 * @expose fetchEvents
 * @description Macht die `fetchEvents`-Funktion für die Elternkomponente zugänglich,
 * sodass `HomeView` sie über `eventListRef.value?.fetchEvents()` aufrufen kann.
 */
defineExpose({
  fetchEvents,
})
</script>

<style scoped>
/* Gesamtcontainer für die Event-Liste */
.event-list-container {
  max-width: 800px;
  margin: 20px auto;
  padding: 20px;
  background-color: #f9f9f9;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* Überschrift der Liste */
h2 {
  color: #333;
  text-align: center;
  margin-bottom: 20px;
}

/* Filter Section Styling */
.filters {
  background-color: #e0f2f7;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
  align-items: end; /* Labels und Inputs an der Basislinie ausrichten */
}

/* Überschrift für den Filterbereich */
.filters h3 {
  grid-column: 1 / -1; /* Nimmt die volle Breite im Grid ein */
  text-align: center;
  color: #0056b3;
  margin-top: 0;
  margin-bottom: 10px;
}

/* Allgemeine Stilregeln für Formulargruppen innerhalb der Filter */
.filters .form-group {
  margin-bottom: 0; /* Standard-Margin der Formulargruppen überschreiben */
}

/* WICHTIG: Stil für die Labels der Filterfelder */
.filters label {
  font-weight: bold; /* Macht die Labels fett und gut lesbar */
  margin-bottom: 3px; /* Kleiner Abstand zum Input-Feld */
  font-size: 0.9em;
  display: block; /* Stellt sicher, dass das Label über dem Input steht */
  color: #333; /* Dunklere Farbe für bessere Sichtbarkeit */
}

/* Stil für Text- und Datum-Input-Felder in den Filtern */
.filters input[type='text'],
.filters input[type='date'] {
  width: calc(100% - 10px); /* Volle Breite minus Padding und Border */
  padding: 8px;
  border: 1px solid #a7d9eb;
  border-radius: 4px;
}

/* Gruppe für Checkboxen und deren Labels */
.filters .checkbox-group {
  display: flex;
  align-items: center; /* Checkbox und Label auf einer Linie ausrichten */
  gap: 8px; /* Abstand zwischen Checkbox und Label */
}

/* Stil für die Labels von Checkboxen (nicht fett) */
.filters .checkbox-group label {
  margin-bottom: 0;
  font-weight: normal; /* Checkbox-Labels bleiben normalgewichtet */
}

/* Größe der Checkboxen anpassen */
.filters input[type='checkbox'] {
  transform: scale(1.2);
}

/* Stil für den "Reset Filters" Button */
.reset-button {
  background-color: #ffc107; /* Gelber Hintergrund */
  color: #333; /* Dunkle Schriftfarbe */
  padding: 8px 15px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 0.9em;
  transition: background-color 0.2s;
  grid-column: 1 / -1; /* Nimmt die volle Breite im Grid ein */
  justify-self: center; /* Zentriert den Button horizontal */
  width: fit-content; /* Breite passt sich dem Inhalt an */
}

/* Hover-Effekt für den Reset-Button */
.reset-button:hover {
  background-color: #e0a800;
}

/* Allgemeine Liste der Events */
.event-list {
  list-style: none; /* Keine Standard-Listenpunkte */
  padding: 0;
}

/* Stil für jedes einzelne Event-Element in der Liste */
.event-item {
  background-color: white;
  border: 1px solid #ddd;
  border-radius: 6px;
  margin-bottom: 15px;
  padding: 15px;
  display: flex; /* Flexbox für horizontale Anordnung von Details und Aktionen */
  justify-content: space-between; /* Abstand zwischen Details und Aktionen */
  align-items: center; /* Vertikale Zentrierung */
  transition: transform 0.2s ease-in-out; /* Sanfter Hover-Effekt */
}

/* Hover-Effekt für Event-Elemente */
.event-item:hover {
  transform: translateY(-2px); /* Leichtes Anheben */
}

/* Details-Bereich des Events (enthält Checkbox und Text) */
.event-details {
  flex-grow: 1; /* Nimmt den meisten verfügbaren Platz ein */
  margin-right: 20px;
  display: flex; /* Flexbox für Checkbox und Text */
  align-items: flex-start; /* Elemente oben ausrichten */
  gap: 10px; /* Abstand zwischen Checkbox und Label */
}

/* Textinhalt der Event-Details */
.event-details > div {
  flex-grow: 1;
}

/* Checkbox für den Abschlussstatus */
.completion-checkbox {
  flex-shrink: 0; /* Nicht schrumpfen lassen */
  transform: scale(1.5); /* Größer darstellen */
  margin-top: 5px; /* Leichter Abstand nach unten */
}

/* Stil für abgeschlossene Events (durchgestrichen und grau) */
.completed h3,
.completed p {
  text-decoration: line-through;
  color: #888;
}

/* Stil für den Status-Text */
.status-text {
  font-weight: bold;
  font-size: 0.9em;
  margin-top: 10px;
}

/* Farben für den Abschlussstatus */
.status-completed {
  color: #28a745; /* Grün */
}

.status-incomplete {
  color: #dc3545; /* Rot */
}

/* Stil für den Event-Titel */
.event-item h3 {
  color: #0056b3;
  margin-top: 0;
  margin-bottom: 5px;
  font-size: 1.2em;
}

/* Stil für Event-Absätze (Beschreibung, Datum/Zeit) */
.event-item p {
  margin-bottom: 5px;
  color: #555;
  line-height: 1.4;
}

/* Kein Margin am letzten Absatz */
.event-item p:last-child {
  margin-bottom: 0;
}

/* Nachricht, wenn keine Events gefunden wurden */
.no-events-message {
  text-align: center;
  color: #666;
  font-style: italic;
  margin-top: 30px;
}

/* Aktionsbuttons (Edit, Delete) */
.event-actions {
  display: flex;
  gap: 10px; /* Abstand zwischen den Buttons */
}

/* Allgemeine Button-Stile */
.event-item button {
  padding: 8px 15px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 0.9em;
  transition:
    background-color 0.2s,
    transform 0.1s;
}

/* Stil für den "Delete" Button */
.delete-button {
  background-color: #dc3545; /* Rot */
  color: white;
}

/* Hover-Effekt für den Delete-Button */
.delete-button:hover {
  background-color: #c82333;
  transform: translateY(-1px);
}

/* Stil für den "Edit" Button */
.edit-button {
  background-color: #007bff; /* Blau */
  color: white;
}

/* Hover-Effekt für den Edit-Button */
.edit-button:hover {
  background-color: #0056b3;
  transform: translateY(-1px);
}
</style>
