import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, Text, useTheme } from 'react-native-paper';

export default function HomeScreen({ navigation }) {
  const [query, setQuery] = useState('');
  const theme = useTheme();

  const handleSearch = () => {
    if (query.trim()) {
      navigation.navigate('Results', { query });
    }
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: theme.colors.background }]} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <Text variant="displayMedium" style={[styles.title, { color: theme.colors.primary }]}>
          Libros Libres
        </Text>
        <Text variant="bodyLarge" style={styles.subtitle}>
          Busca y descarga clásicos de dominio público en español.
        </Text>

        <TextInput
          mode="outlined"
          label="Buscar libro, autor o saga..."
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
          left={<TextInput.Icon icon="magnify" />}
          style={styles.input}
        />

        <Button 
          mode="contained" 
          onPress={handleSearch} 
          style={styles.button}
          contentStyle={{ paddingVertical: 8 }}
        >
          Buscar
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 32,
    opacity: 0.7,
  },
  input: {
    marginBottom: 20,
  },
  button: {
    marginTop: 10,
    borderRadius: 8,
  }
});
