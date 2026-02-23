import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput } from 'react-native';

import { Card } from '../components/card';
import { apiPost } from '../lib/api';

export default function CallOutcomeScreen(): JSX.Element {
  const [eventId, setEventId] = useState('');
  const [outcome, setOutcome] = useState('Reached client, requested follow-up tomorrow');
  const [notes, setNotes] = useState('Client interaction note');

  const mutation = useMutation({
    mutationFn: () =>
      apiPost(`/calls/${eventId}/outcome`, {
        outcome,
        notes,
        completed_at: new Date().toISOString()
      })
  });

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Post-Call Outcome</Text>
      <Card>
        <TextInput value={eventId} onChangeText={setEventId} style={styles.input} placeholder="Call Event ID" />
        <TextInput value={outcome} onChangeText={setOutcome} style={styles.input} placeholder="Outcome" />
        <TextInput
          value={notes}
          onChangeText={setNotes}
          style={[styles.input, styles.largeInput]}
          placeholder="Notes"
          multiline
        />
        <Pressable style={styles.button} onPress={() => mutation.mutate()}>
          <Text style={styles.buttonText}>Submit Outcome</Text>
        </Pressable>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  heading: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 12,
    color: '#1A3B2E'
  },
  input: {
    borderWidth: 1,
    borderColor: '#C8BFAE',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    backgroundColor: '#FFFFFF'
  },
  largeInput: {
    minHeight: 90,
    textAlignVertical: 'top'
  },
  button: {
    backgroundColor: '#1F7A4C',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center'
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700'
  }
});
