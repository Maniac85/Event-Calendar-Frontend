/*import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach, afterEach, type MockedFunction } from 'vitest'
import EventList from '/home/schlingel/Dokumente/WebTech/Git/Event-Calendar-Frontend/src/components/EventList.vue' // <-- BITTE PFAD HIER ANPASSEN, WENN NÖTIG IST, DASS ER AUF IHRE DATEI ZEIGT

// Mock-Daten für Events
const mockEvents = [
  {
    id: 1,
    title: 'Konzert A',
    description: 'Rockkonzert',
    startDateTime: '2025-07-10T10:00:00',
    endDateTime: '2025-07-10T12:00:00',
    isCompleted: false,
  },
  {
    id: 2,
    title: 'Workshop B',
    description: 'Vue.js Workshop',
    startDateTime: '2025-07-15T09:00:00',
    endDateTime: '2025-07-15T17:00:00',
    isCompleted: false,
  },
  {
    id: 3,
    title: 'Konzert C',
    description: 'Klassisches Konzert',
    startDateTime: '2025-07-20T19:00:00',
    endDateTime: '2025-07-20T21:00:00',
    isCompleted: true,
  },
]

describe('EventList Komponente - Neue Version', () => {
  let fetchSpy: MockedFunction<typeof global.fetch>
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>
  let windowAlertSpy: ReturnType<typeof vi.spyOn>
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>
  let windowConfirmSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    fetchSpy = vi.spyOn(global, 'fetch') as MockedFunction<typeof global.fetch>
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    windowAlertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    windowConfirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true) // Default to true for deletes
    vi.useFakeTimers() // Fake-Timer für Debounce-Funktionen und Promise-Auflösung aktivieren
  })

  afterEach(() => {
    fetchSpy.mockRestore()
    consoleErrorSpy.mockRestore()
    windowAlertSpy.mockRestore()
    consoleWarnSpy.mockRestore()
    windowConfirmSpy.mockRestore()
    vi.useRealTimers() // Echte Timer wiederherstellen
  })

  // --- Testfall: Initiales Laden und Anzeigen von Events ---
  it('sollte Events beim Mounten laden und anzeigen', async () => {
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify(mockEvents), { status: 200 }))

    const wrapper = mount(EventList)

    await vi.runAllTimers() // Warten, bis alle Promises (inkl. fetch) und Debounce-Timer durchgelaufen sind
    await wrapper.vm.$nextTick() // Sicherstellen, dass Vue DOM-Updates verarbeitet hat

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(fetchSpy).toHaveBeenCalledWith('http://localhost:8080/events?')
    expect(wrapper.findAll('.event-item')).toHaveLength(mockEvents.length)
    expect(wrapper.text()).toContain('Konzert A')
    expect(wrapper.text()).toContain('Workshop B')
    expect(consoleErrorSpy).not.toHaveBeenCalled()
    expect(windowAlertSpy).not.toHaveBeenCalled()
  })

  // --- Testfall: Fehler beim Laden von Events ---
  it('sollte eine Fehlermeldung anzeigen, wenn das Laden der Events fehlschlägt', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response('Serverfehler beim Laden', { status: 500, statusText: 'Internal Server Error' }),
    )

    const wrapper = mount(EventList)
    await vi.runAllTimers() // Warten, bis der initiale Fetch abgeschlossen ist
    await wrapper.vm.$nextTick() // Sicherstellen, dass Fehlerbehandlung und UI-Update abgearbeitet sind

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1)
    expect(windowAlertSpy).toHaveBeenCalledTimes(1)
    expect(windowAlertSpy).toHaveBeenCalledWith(
      expect.stringContaining('Error fetching events: 500'),
    )
    expect(wrapper.text()).toContain('No events found.')
    expect(wrapper.findAll('.event-item')).toHaveLength(0)
  })

  // --- Testfall: Events nach Titel filtern (mit Debounce) ---
  it('sollte Events nach Titel filtern mit Debounce', async () => {
    // Mock für die initiale Liste (alle Events)
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify(mockEvents), { status: 200 }))
    const wrapper = mount(EventList)
    await vi.runAllTimers() // Warten auf initialen fetch
    fetchSpy.mockClear() // Fetch-Zähler zurücksetzen für den nächsten Aufruf

    // Mock für den Filter-Aufruf (z.B. nur 'Konzert A')
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify([mockEvents[0]]), { status: 200 }))

    const filterInput = wrapper.find('#filterTitle')
    await filterInput.setValue('Konzert')

    // Warten auf das Debounce-Timeout
    vi.advanceTimersByTime(300)
    await vi.runAllTimers() // Sicherstellen, dass der debounced fetch abgeschlossen ist
    await wrapper.vm.$nextTick() // Warten auf Re-Render nach Filterung

    expect(fetchSpy).toHaveBeenCalledTimes(1) // Nur ein Fetch für den Filter
    expect(fetchSpy).toHaveBeenCalledWith('http://localhost:8080/events?title=Konzert')
    expect(wrapper.findAll('.event-item')).toHaveLength(1)
    expect(wrapper.text()).toContain('Konzert A')
    expect(wrapper.text()).not.toContain('Workshop B')
    expect(consoleErrorSpy).not.toHaveBeenCalled()
  })

  // --- Testfall: Events nach Startdatum filtern ---
  it('sollte Events nach Startdatum filtern', async () => {
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify(mockEvents), { status: 200 }))
    const wrapper = mount(EventList)
    await vi.runAllTimers() // Warten auf initialen fetch
    fetchSpy.mockClear()

    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify([mockEvents[1]]), { status: 200 }))

    const filterInput = wrapper.find('#filterStartDate')
    await filterInput.setValue('2025-07-15') // Datum, das nur Workshop B matcht

    await vi.runAllTimers()
    await wrapper.vm.$nextTick()

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(fetchSpy).toHaveBeenCalledWith('http://localhost:8080/events?startDate=2025-07-15')
    expect(wrapper.findAll('.event-item')).toHaveLength(1)
    expect(wrapper.text()).toContain('Workshop B')
    expect(wrapper.text()).not.toContain('Konzert A')
  })

  // --- Testfall: Filter für abgeschlossene Events ---
  it('sollte nur abgeschlossene Events anzeigen, wenn isCompleted ausgewählt ist', async () => {
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify(mockEvents), { status: 200 }))
    const wrapper = mount(EventList)
    await vi.runAllTimers()
    fetchSpy.mockClear()

    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify([mockEvents[2]]), { status: 200 })) // Konzert C ist abgeschlossen

    const completedCheckbox = wrapper.find('#filterCompleted')
    await completedCheckbox.setValue(true)

    await vi.runAllTimers()
    await wrapper.vm.$nextTick()

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(fetchSpy).toHaveBeenCalledWith('http://localhost:8080/events?isCompleted=true')
    expect(wrapper.findAll('.event-item')).toHaveLength(1)
    expect(wrapper.text()).toContain('Konzert C')
    expect(wrapper.text()).not.toContain('Konzert A')
  })

  // --- Testfall: Filter für unvollständige Events ---
  it('sollte nur unvollständige Events anzeigen, wenn isIncomplete ausgewählt ist', async () => {
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify(mockEvents), { status: 200 }))
    const wrapper = mount(EventList)
    await vi.runAllTimers()
    fetchSpy.mockClear()

    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify([mockEvents[0], mockEvents[1]]), { status: 200 }),
    ) // Konzert A, Workshop B sind unvollständig

    const incompleteCheckbox = wrapper.find('#filterIncomplete')
    await incompleteCheckbox.setValue(true)

    await vi.runAllTimers()
    await wrapper.vm.$nextTick()

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(fetchSpy).toHaveBeenCalledWith('http://localhost:8080/events?isCompleted=false')
    expect(wrapper.findAll('.event-item')).toHaveLength(2)
    expect(wrapper.text()).toContain('Konzert A')
    expect(wrapper.text()).toContain('Workshop B')
    expect(wrapper.text()).not.toContain('Konzert C')
  })

  // --- Testfall: Beide Abschlussfilter gleichzeitig aktivieren (sollte zurücksetzen) ---
  it('sollte beide Abschlussfilter zurücksetzen, wenn beide gleichzeitig ausgewählt werden', async () => {
    fetchSpy.mockResolvedValue(new Response(JSON.stringify(mockEvents), { status: 200 })) // Mock für alle Fetch-Aufrufe
    const wrapper = mount(EventList)
    await vi.runAllTimers() // Warten auf initialen fetch
    fetchSpy.mockClear() // Fetch-Zähler zurücksetzen

    const completedCheckbox = wrapper.find('#filterCompleted')
    const incompleteCheckbox = wrapper.find('#filterIncomplete')

    // Beide auf true setzen, was den Watcher auslösen sollte
    await completedCheckbox.setValue(true)
    await incompleteCheckbox.setValue(true)
    await vi.runAllTimers() // Warten auf Watcher-Effekt
    await wrapper.vm.$nextTick()

    expect((completedCheckbox.element as HTMLInputElement).checked).toBe(false)
    expect((incompleteCheckbox.element as HTMLInputElement).checked).toBe(false)
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Beide Abschlussfilter wurden ausgewählt, setze beide zurück.'),
    )

    // Der fetchEvents sollte NICHT mit Filter aufgerufen werden, da beide Filter zurückgesetzt wurden.
    // Der letzte Fetch sollte nach dem Reset stattfinden, ohne isCompleted/isIncomplete Filter.
    expect(fetchSpy).toHaveBeenCalledTimes(1) // Es sollte nur einen Fetch-Aufruf nach dem Reset geben.
    expect(fetchSpy).toHaveBeenCalledWith('http://localhost:8080/events?') // Ohne isCompleted-Parameter
  })

  // --- Testfall: Filter zurücksetzen ---
  it('sollte alle Filter zurücksetzen und alle Events erneut laden', async () => {
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify(mockEvents), { status: 200 }))
    const wrapper = mount(EventList)
    await vi.runAllTimers()
    fetchSpy.mockClear() // Clear initial fetch

    // Apply some filters
    const titleFilter = wrapper.find('#filterTitle')
    await titleFilter.setValue('Konzert')
    vi.advanceTimersByTime(300)
    await vi.runAllTimers()
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify([mockEvents[0], mockEvents[2]]), { status: 200 }),
    ) // Filtered results
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Konzert A') // Filter should be active

    // Mock for reset fetch
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify(mockEvents), { status: 200 }))

    await wrapper.find('.reset-button').trigger('click')
    await vi.runAllTimers()
    await wrapper.vm.$nextTick()

    expect((titleFilter.element as HTMLInputElement).value).toBe('')
    expect((wrapper.find('#filterCompleted').element as HTMLInputElement).checked).toBe(false)
    expect(fetchSpy).toHaveBeenCalledTimes(2) // One for initial filter, one for reset
    expect(fetchSpy).toHaveBeenCalledWith('http://localhost:8080/events?') // Reset should fetch all
    expect(wrapper.findAll('.event-item')).toHaveLength(mockEvents.length) // All events should be visible
  })

  // --- Testfall: Abschlussstatus umschalten ---
  it('sollte den Abschlussstatus eines Events umschalten', async () => {
    const initialEvents = [
      {
        id: 1,
        title: 'Test Event',
        description: 'Desc',
        startDateTime: '2025-07-01T10:00:00',
        endDateTime: '2025-07-01T11:00:00',
        isCompleted: false,
      },
    ]
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify(initialEvents), { status: 200 }))
    const wrapper = mount(EventList)
    await vi.runAllTimers()
    await wrapper.vm.$nextTick()
    fetchSpy.mockClear() // Clear initial fetch

    const completionCheckbox = wrapper.find('.completion-checkbox')
    expect((completionCheckbox.element as HTMLInputElement).checked).toBe(false)
    expect(wrapper.text()).toContain('Status: Incomplete')

    // Mock den PATCH-Request zum Umschalten des Abschlussstatus
    fetchSpy.mockResolvedValueOnce(new Response(null, { status: 200 }))

    await completionCheckbox.setValue(true) // Direkt auf checked setzen
    await vi.runAllTimers() // Sicherstellen, dass der PATCH-Request abgeschlossen ist
    await wrapper.vm.$nextTick()

    expect(fetchSpy).toHaveBeenCalledTimes(1) // PATCH-Aufruf
    expect(fetchSpy).toHaveBeenCalledWith(
      'http://localhost:8080/events/1/complete?isCompleted=true',
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      },
    )
    expect((completionCheckbox.element as HTMLInputElement).checked).toBe(true)
    expect(wrapper.text()).toContain('Status: Completed')

    // Zurück auf "Incomplete" umschalten
    fetchSpy.mockResolvedValueOnce(new Response(null, { status: 200 }))
    await completionCheckbox.setValue(false) // Direkt auf unchecked setzen
    await vi.runAllTimers()
    await wrapper.vm.$nextTick()

    expect(fetchSpy).toHaveBeenCalledTimes(2) // + ein weiterer PATCH-Aufruf
    expect(fetchSpy).toHaveBeenCalledWith(
      'http://localhost:8080/events/1/complete?isCompleted=false',
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      },
    )
    expect((completionCheckbox.element as HTMLInputElement).checked).toBe(false)
    expect(wrapper.text()).toContain('Status: Incomplete')
  })

  // Testfall: Fehler beim Umschalten des Abschlussstatus
  it('sollte eine Fehlermeldung anzeigen und Status zurücksetzen, wenn das Umschalten fehlschlägt', async () => {
    const initialEvents = [
      {
        id: 1,
        title: 'Test Event',
        description: 'Desc',
        startDateTime: '2025-07-01T10:00:00',
        endDateTime: '2025-07-01T11:00:00',
        isCompleted: false,
      },
    ]
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify(initialEvents), { status: 200 }))
    const wrapper = mount(EventList)
    await vi.runAllTimers()
    await wrapper.vm.$nextTick()
    fetchSpy.mockClear()

    const completionCheckbox = wrapper.find('.completion-checkbox')
    expect((completionCheckbox.element as HTMLInputElement).checked).toBe(false)

    // Mock den PATCH-Request, der fehlschlägt
    fetchSpy.mockResolvedValueOnce(new Response('Update failed', { status: 500 }))

    await completionCheckbox.setValue(true) // Versuchen, auf true zu setzen
    await vi.runAllTimers() // Warten, bis der PATCH-Request und Fehlerbehandlung abgeschlossen sind
    await wrapper.vm.$nextTick()

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1)
    expect(windowAlertSpy).toHaveBeenCalledTimes(1)
    expect(windowAlertSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to update completion status: 500 - Update failed'),
    )

    // Checkbox-Status sollte zurückgesetzt werden (Rollback)
    expect((completionCheckbox.element as HTMLInputElement).checked).toBe(false) // Sollte zum ursprünglichen Zustand zurückkehren
    expect(wrapper.text()).toContain('Status: Incomplete') // Statustext sollte sich auch zurücksetzen
  })

  // --- Testfall: Event löschen ---
  it('sollte ein Event löschen und aus der Liste entfernen', async () => {
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify(mockEvents), { status: 200 }))
    const wrapper = mount(EventList)
    await vi.runAllTimers()
    await wrapper.vm.$nextTick()
    fetchSpy.mockClear()

    expect(wrapper.findAll('.event-item')).toHaveLength(3)

    // Mock für den DELETE-Request (Event ID 1)
    fetchSpy.mockResolvedValueOnce(new Response(null, { status: 204 }))
    // Mock für den Re-Fetch nach dem Löschen
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify(mockEvents.filter((e) => e.id !== 1)), { status: 200 }),
    )

    windowConfirmSpy.mockReturnValueOnce(true) // Bestätigung für Löschen

    const deleteButton = wrapper.findAll('.delete-button').at(0)
    expect(deleteButton).toBeDefined()
    await deleteButton?.trigger('click')

    await vi.runAllTimers() // Warten auf confirm, DELETE, und Re-Fetch
    await wrapper.vm.$nextTick()

    expect(windowConfirmSpy).toHaveBeenCalledWith(
      expect.stringContaining('Are you sure you want to delete the event "Konzert A" (ID: 1)?'),
    )
    expect(fetchSpy).toHaveBeenCalledTimes(2) // DELETE, dann Re-Fetch
    expect(fetchSpy).toHaveBeenCalledWith('http://localhost:8080/events/1', { method: 'DELETE' })
    expect(wrapper.findAll('.event-item')).toHaveLength(2)
    expect(wrapper.text()).not.toContain('Konzert A')
    expect(wrapper.text()).toContain('Workshop B')
    expect(consoleErrorSpy).not.toHaveBeenCalled()
    expect(windowAlertSpy).not.toHaveBeenCalled()
  })

  // --- Testfall: Löschen abbrechen ---
  it('sollte ein Event nicht löschen, wenn der Löschvorgang abgebrochen wird', async () => {
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify(mockEvents), { status: 200 }))
    const wrapper = mount(EventList)
    await vi.runAllTimers()
    await wrapper.vm.$nextTick()
    fetchSpy.mockClear() // Clear initial fetch

    expect(wrapper.findAll('.event-item')).toHaveLength(3)

    windowConfirmSpy.mockReturnValueOnce(false) // Abbruch für Löschen

    const deleteButton = wrapper.findAll('.delete-button').at(0)
    await deleteButton?.trigger('click')

    await vi.runAllTimers() // Warten auf confirm
    await wrapper.vm.$nextTick()

    expect(windowConfirmSpy).toHaveBeenCalledWith(
      expect.stringContaining('Are you sure you want to delete the event "Konzert A" (ID: 1)?'),
    )
    expect(fetchSpy).not.toHaveBeenCalled() // KEIN Fetch-Aufruf (DELETE) sollte erfolgt sein
    expect(wrapper.findAll('.event-item')).toHaveLength(3) // Anzahl der Events sollte unverändert bleiben
  })

  // --- Testfall: Fehler beim Löschen eines Events ---
  it('sollte eine Fehlermeldung anzeigen, wenn das Löschen fehlschlägt', async () => {
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify(mockEvents), { status: 200 }))
    const wrapper = mount(EventList)
    await vi.runAllTimers()
    await wrapper.vm.$nextTick()
    fetchSpy.mockClear()

    expect(wrapper.findAll('.event-item')).toHaveLength(3)

    fetchSpy.mockResolvedValueOnce(
      new Response('Fehler beim Löschen auf dem Server', { status: 500 }),
    )
    windowConfirmSpy.mockReturnValueOnce(true) // Bestätigung für Löschen

    const deleteButton = wrapper.findAll('.delete-button').at(0)
    await deleteButton?.trigger('click')

    await vi.runAllTimers() // Warten auf confirm und DELETE-Versuch
    await wrapper.vm.$nextTick()

    expect(fetchSpy).toHaveBeenCalledTimes(1) // Nur der DELETE-Versuch
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1)
    expect(windowAlertSpy).toHaveBeenCalledTimes(1)
    expect(windowAlertSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to delete event: 500 - Fehler beim Löschen auf dem Server'),
    )
    expect(wrapper.findAll('.event-item')).toHaveLength(3) // Events sollten noch da sein
  })

  // --- Testfall: editEvent Event emittieren ---
  it('sollte ein "editEvent" Event mit der richtigen ID emittieren, wenn der Edit-Button geklickt wird', async () => {
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify(mockEvents), { status: 200 }))
    const wrapper = mount(EventList)
    await vi.runAllTimers()
    await wrapper.vm.$nextTick()

    const editButton = wrapper.find('.edit-button')
    await editButton.trigger('click')

    expect(wrapper.emitted('editEvent')).toBeTruthy()
    expect(wrapper.emitted('editEvent')![0][0]).toBe(mockEvents[0].id) // ID des ersten Events
  })
})
*/
