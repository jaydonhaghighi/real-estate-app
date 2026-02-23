import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput } from 'react-native';

import { Card } from '../components/card';
import { apiPut } from '../lib/api';

export default function SettingsScreen(): JSX.Element {
  const [language, setLanguage] = useState('en');

  const mutation = useMutation({
    mutationFn: () =>
      apiPut('/team/rules', {
        timezone: 'UTC',
        at_risk_threshold_percent: 80
      })
  });

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Language & Rules</Text>
      <Card>
        <Text style={styles.label}>Preferred Language</Text>
        <TextInput value={language} onChangeText={setLanguage} style={styles.input} placeholder="en" />
        <Pressable style={styles.button} onPress={() => mutation.mutate()}>
          <Text style={styles.buttonText}>Save Team Rules</Text>
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
  label: {
    fontWeight: '700',
    marginBottom: 8
  },
  input: {
    borderWidth: 1,
    borderColor: '#C8BFAE',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    backgroundColor: '#FFFFFF'
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
