<template>
  <div class="event-list-container">
    <h2>Events</h2>
    <ul class="event-list">
      <li v-for="event in events" :key="event.id" class="event-item">
        <div class="event-details">
          <h3>{{ event.title }}</h3>
          <p><strong>Description:</strong> {{ event.description }}</p>
          <p><strong>Start:</strong> {{ new Date(event.startDateTime).toLocaleString() }}</p>
          <p><strong>End:</strong> {{ new Date(event.endDateTime).toLocaleString() }}</p>
        </div>
        <div class="event-actions">
          <button @click="emitEditEvent(event.id)" class="edit-button">Edit</button>
          <button @click="confirmDelete(event.id, event.title)" class="delete-button">
            Delete
          </button>
        </div>
      </li>
    </ul>
    <p v-if="events.length === 0">No events found.</p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

// Definiert die Struktur eines Event-Objekts, wie es vom Backend erwartet/empfangen wird.
interface Event {
  id: number // Eindeutige Kennung des Events
  title: string
  description: string
  startDateTime: string // Datum und Uhrzeit des Event-Starts (z.B. im ISO-Format)
  endDateTime: string // Datum und Uhrzeit des Event-Endes (z.B. im ISO-Format)
}

// Definiert die Ereignisse (Emits), die diese Komponente an ihre Elternkomponente senden kann.
// 'eventCreated' (optional, könnte durch 'eventSubmitted' in EventForm ersetzt werden)
// 'editEvent' wird ausgelöst, wenn der Bearbeiten-Button geklickt wird.
const emits = defineEmits(['eventCreated', 'editEvent'])

// Eine reaktive Variable, die ein Array von Event-Objekten speichert.
// Dies ist die Datenquelle für die angezeigte Liste der Events.
const events = ref<Event[]>([])

// Ruft die Liste der Events vom Backend ab und aktualisiert die 'events'-Variable.
const fetchEvents = async () => {
  console.log('--- Fetching events ---') // Debug-Log: Start des Abrufs
  try {
    // Ermittelt die Basis-URL des Backends aus den Umgebungsvariablen.
    const backendUrl = import.meta.env.VITE_APP_API_BASE_URL || 'http://localhost:8080'

    // Führt eine HTTP GET-Anfrage an den /events-Endpunkt des Backends aus.
    const response = await fetch(`${backendUrl}/events`)
    console.log('Response:', response) // Debug-Log: HTTP-Antwort
    console.log('Response Status:', response.status) // Debug-Log: HTTP-Status

    // Überprüft, ob die Antwort erfolgreich war (Status 2xx).
    if (!response.ok) {
      console.error('HTTP error!', response.status)
      return // Beendet die Funktion bei einem Fehler.
    }
    // Konvertiert die JSON-Antwort in ein JavaScript-Objekt.
    const data = await response.json()
    console.log('Data:', data) // Debug-Log: Empfangene Daten
    // Weist die empfangenen Daten der 'events'-Variablen zu, um die Liste zu aktualisieren.
    events.value = data as Event[]
    console.log('Events.value:', events.value) // Debug-Log: Aktualisierter Zustand der Events
  } catch (error) {
    console.error('Fetch error:', error) // Fehlerbehandlung bei Netzwerk- oder Fetch-Problemen
  }
  console.log('--- Fetching complete ---') // Debug-Log: Ende des Abrufs
}

// Fordert eine Bestätigung vom Benutzer, bevor ein Event gelöscht wird.
const confirmDelete = async (id: number, title: string) => {
  if (confirm(`Are you sure you want to delete the event "${title}" (ID: ${id})?`)) {
    await deleteEvent(id) // Ruft die Löschfunktion auf, wenn bestätigt wird.
  }
}

// Sendet eine DELETE-Anfrage an das Backend, um ein spezifisches Event zu löschen.
const deleteEvent = async (id: number) => {
  try {
    const backendUrl = import.meta.env.VITE_APP_API_BASE_URL || 'http://localhost:8080'
    const url = `${backendUrl}/events/${id}` // Die URL für das zu löschende Event.

    // Führt die HTTP DELETE-Anfrage aus.
    const response = await fetch(url, {
      method: 'DELETE',
    })

    if (response.ok) {
      console.log(`Event with ID ${id} successfully deleted.`)
      fetchEvents() // Aktualisiert die Event-Liste nach erfolgreichem Löschen.
    } else {
      // Bei einem Fehler wird der Antworttext gelesen und eine Fehlermeldung angezeigt.
      const errorText = await response.text()
      console.error(`Error deleting event with ID ${id}: ${response.status} - ${errorText}`)
      alert(`Failed to delete event: ${response.status} - ${errorText}`)
    }
  } catch (error) {
    console.error('Network error during delete:', error)
    alert('Network error or unable to connect to backend.')
  }
}

// Sendet ein 'editEvent'-Signal mit der ID des zu bearbeitenden Events an die Elternkomponente.
const emitEditEvent = (id: number) => {
  console.log('EventList: Sende Signal zum Bearbeiten von Event ID:', id) // Debug-Log
  emits('editEvent', id)
}

// 'onMounted' ist ein Lifecycle-Hook, der 'fetchEvents' aufruft,
// sobald die Komponente im DOM initialisiert wurde.
onMounted(fetchEvents)

// Exponiert (macht zugänglich) die 'fetchEvents'-Funktion für die Elternkomponente.
// Dies ermöglicht der Elternkomponente (HomeView), die Liste manuell zu aktualisieren.
defineExpose({
  fetchEvents,
})
</script>

<style scoped>
/* Gesamtcontainer für die Event-Liste */
.event-list-container {
  max-width: 800px; /* Maximale Breite der Liste */
  margin: 20px auto; /* Zentrierung auf der Seite mit Abstand oben/unten */
  padding: 20px;
  background-color: #f9f9f9; /* Heller Hintergrund */
  border-radius: 8px; /* Abgerundete Ecken */
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); /* Leichter Schatten für Tiefe */
}

/* Überschrift der Liste */
h2 {
  color: #333; /* Dunkler Text */
  text-align: center;
  margin-bottom: 20px;
}

/* Allgemeine Liste der Events */
.event-list {
  list-style: none; /* Entfernt die Standard-Aufzählungspunkte */
  padding: 0; /* Entfernt den Standard-Padding */
}

/* Stil für jedes einzelne Event-Element in der Liste */
.event-item {
  background-color: white; /* Weißer Hintergrund für jedes Event */
  border: 1px solid #ddd; /* Leichter Rand */
  border-radius: 6px; /* Abgerundete Ecken */
  margin-bottom: 15px; /* Abstand zwischen den Events */
  padding: 15px;
  display: flex; /* Nutzt Flexbox für die horizontale Anordnung von Details und Buttons */
  justify-content: space-between; /* Verteilt den Platz, Details links, Buttons rechts */
  align-items: center; /* Vertikale Zentrierung der Inhalte */
  transition: transform 0.2s ease-in-out; /* Sanfte Hover-Animation für Bewegung */
}

/* Effekt beim Überfahren (Hover) eines Event-Elements */
.event-item:hover {
  transform: translateY(-2px); /* Hebt das Element beim Hovern leicht an */
}

/* Container für die Event-Details (Titel, Beschreibung, Zeiten) */
.event-details {
  flex-grow: 1; /* Lässt die Details den verfügbaren Platz einnehmen */
  margin-right: 20px; /* Abstand zu den Buttons */
}

/* Stil für den Titel des Events */
.event-item h3 {
  color: #0056b3; /* Blauer Text für den Titel */
  margin-top: 0;
  margin-bottom: 5px;
  font-size: 1.2em; /* Etwas größere Schriftgröße */
}

/* Stil für Absätze (Beschreibung und Zeiten) innerhalb eines Event-Items */
.event-item p {
  margin-bottom: 5px;
  color: #555; /* Grauer Text */
  line-height: 1.4; /* Zeilenhöhe für bessere Lesbarkeit */
}

/* Kein Bodenabstand für den letzten Absatz in einem Event-Item */
.event-item p:last-child {
  margin-bottom: 0;
}

/* Container für die Aktions-Buttons (Edit, Delete) */
.event-actions {
  display: flex;
  gap: 10px; /* Abstand zwischen den Buttons */
}

/* Allgemeine Stilregeln für Buttons innerhalb von Event-Items */
.event-item button {
  padding: 8px 15px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 0.9em;
  transition:
    background-color 0.2s,
    transform 0.1s; /* Sanfte Übergänge für Interaktionen */
}

/* Spezifischer Stil für den Delete-Button */
.delete-button {
  background-color: #dc3545; /* Roter Hintergrund */
  color: white; /* Weißer Text */
}

/* Hover-Effekt für den Delete-Button */
.delete-button:hover {
  background-color: #c82333; /* Dunkleres Rot bei Hover */
  transform: translateY(-1px); /* Leichte Anhebung bei Hover */
}
/* Spezifischer Stil für den Edit-Button */
.edit-button {
  background-color: #007bff; /* Blauer Hintergrund */
  color: white; /* Weißer Text */
}

/* Hover-Effekt für den Edit-Button */
.edit-button:hover {
  background-color: #0056b3; /* Dunkleres Blau bei Hover */
  transform: translateY(-1px); /* Leichte Anhebung bei Hover */
}
</style>
