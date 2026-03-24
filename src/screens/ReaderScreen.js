import React from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import { Appbar, useTheme, Text } from 'react-native-paper';

export default function ReaderScreen({ route, navigation }) {
  const { book } = route.params;
  const theme = useTheme();

  // On Android, WebView cannot directly render local PDF files easily.
  // A common workaround is using a library like react-native-pdf,
  // but for this example, we'll try to use a simple fallback or 
  // instructions if it fails.
  
  const isPdf = book.localUri.toLowerCase().endsWith('.pdf');
  const isEpub = book.localUri.toLowerCase().endsWith('.epub');

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header style={{ backgroundColor: theme.colors.surface }}>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title={book.title} titleStyle={{ fontSize: 16 }} />
      </Appbar.Header>

      {isPdf ? (
        <WebView 
          source={{ uri: book.localUri }} 
          style={{ flex: 1 }}
          originWhitelist={['*']}
          allowFileAccess={true}
          allowFileAccessFromFileURLs={true}
          allowUniversalAccessFromFileURLs={true}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.warn('WebView error: ', nativeEvent);
            Alert.alert('Error de Lectura', 'No se pudo abrir el PDF internamente. Intenta usar la opción de compartir para abrirlo con otra aplicación.');
          }}
        />
      ) : isEpub ? (
        <View style={styles.center}>
          <Text variant="headlineSmall" style={{ textAlign: 'center', padding: 20 }}>
            Lector EPUB en Desarrollo
          </Text>
          <Text variant="bodyMedium" style={{ textAlign: 'center', opacity: 0.7 }}>
            El soporte para EPUB requiere un motor de renderizado avanzado. 
            Por ahora, usa el botón "Compartir" en la biblioteca para abrirlo con tu lector favorito (como ReadEra).
          </Text>
        </View>
      ) : (
        <View style={styles.center}>
          <Text>Formato no soportado para lectura directa.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }
});
