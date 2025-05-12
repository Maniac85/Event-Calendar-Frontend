<template>
  <div>
    <h1>Calendar Events</h1>
    <ul>
      <li v-for="event in events" :key="event.id">
        <h2>{{ event.title }}</h2>
        <p>{{ event.description }}</p>
        <p>Start: {{ event.startDateTime }}</p>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

interface Event {
  id: number;         //  Or number if your backend sends numbers
  title: string;
  description: string;
  startDateTime: string; //  Or string if that's what the backend sends
  endDateTime: string;   //  Or string
}

const events = ref<Event[]>([]);  //  events is an array of Event objects

onMounted(async () => {
  console.log('--- Fetching events ---');
  try {
    const response = await fetch('http://localhost:8080/events');
    console.log('Response:', response);
    console.log('Response Status:', response.status);
    if (!response.ok) {
      console.error('HTTP error!', response.status);
      return; // Stop if there's an error
    }
    const data = await response.json();
    console.log('Data:', data);
    events.value = data as Event[];
    console.log('Events.value:', events.value);
  } catch (error) {
    console.error('Fetch error:', error);
  }
  console.log('--- Fetching complete ---');
});
</script>
