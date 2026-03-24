import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, Image, TouchableOpacity, Alert, Platform, Linking } from 'react-native';
import { Text, useTheme, ActivityIndicator, IconButton, Card, Searchbar } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { LibraryService } from '../services/libraryService';
import { ScannerService } from '../services/scannerService';
import * as Sharing from 'expo-sharing';
import { FAB, Portal } from 'react-native-paper';

export default function LibraryScreen({ navigation }) {
  const theme = useTheme();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadLibrary = async () => {
    setLoading(true);
    const library = await LibraryService.getLibrary();
    // Filtramos para mostrar solo libros escritos (no audios)
    const textBooks = library.filter(item => !item.isAudio);
    setBooks(textBooks);
    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      loadLibrary();
    }, [])
  );

  const handleDelete = (book) => {
    Alert.alert(
      'Eliminar Libro',
      `¿Estás seguro de que quieres eliminar "${book.title}" de tu biblioteca?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive', 
          onPress: async () => {
            await LibraryService.removeBook(book.id);
            loadLibrary();
          } 
        }
      ]
    );
  };

  const handleOpen = async (book) => {
    if (book.isAudio) {
      if (Platform.OS === 'web') {
        Linking.openURL(book.localUri);
      } else {
        Sharing.shareAsync(book.localUri);
      }
      return;
    }
    navigation.navigate('Reader', { book });
  };
  
  const handleScan = async () => {
    setScanning(true);
    try {
      const results = await ScannerService.scanStorage();
      const allFound = [...results.books, ...results.audio];
      
      if (allFound.length === 0) {
        Alert.alert('Escaneo Finalizado', 'No se encontraron nuevos archivos compatibles en las carpetas comunes.');
      } else {
        let addedCount = 0;
        for (const item of allFound) {
           await LibraryService.addBook(item, item.uri);
           addedCount++;
        }
        await loadLibrary();
        Alert.alert('Escaneo Finalizado', `Se han sincronizado ${addedCount} archivos con tu biblioteca.`);
      }
    } catch (e) {
      Alert.alert('Error', 'No se pudo realizar el escaneo de archivos locales.');
    } finally {
      setScanning(false);
    }
  };

  const filteredBooks = books.filter(book => 
    book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (book.authors && book.authors.some(a => a.name.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  const renderBookItem = ({ item }) => (
    <Card style={styles.card} onPress={() => handleOpen(item)}>
      <View style={styles.cardContent}>
        {item.coverUrl ? (
          <View>
            <Image source={{ uri: item.coverUrl }} style={styles.thumbnail} />
            {item.isAudio && (
              <View style={styles.audioBadge}>
                <IconButton icon="headphones" size={12} iconColor="#fff" />
              </View>
            )}
          </View>
        ) : (
          <View style={[styles.thumbnail, { backgroundColor: '#333', justifyContent: 'center', alignItems: 'center' }]}>
            <IconButton icon={item.isAudio ? "headphones" : "book"} size={30} iconColor="#666" />
          </View>
        )}
        <View style={styles.bookInfo}>
          <Text variant="titleMedium" numberOfLines={2} style={styles.title}>{item.title}</Text>
          <Text variant="bodySmall" style={styles.author}>
            {item.authors?.map(a => a.name).join(', ') || 'Autor desconocido'}
          </Text>
          <Text variant="labelSmall" style={{ marginTop: 4, opacity: 0.6, color: item.isAudio ? '#FF9800' : theme.colors.onSurfaceVariant }}>
            {item.isAudio ? 'Audiolibro' : 'Libro Escrito'} • {new Date(item.dateAdded).toLocaleDateString()}
          </Text>
        </View>
        <View style={styles.actions}>
          <IconButton 
            icon="share-variant" 
            size={20} 
            onPress={() => Sharing.shareAsync(item.localUri)} 
          />
          <IconButton 
            icon="delete-outline" 
            size={20} 
            iconColor={theme.colors.error}
            onPress={() => handleDelete(item)} 
          />
        </View>
      </View>
    </Card>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Searchbar
        placeholder="Buscar en mi biblioteca..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchbar}
      />
      
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
        </View>
      ) : filteredBooks.length === 0 ? (
        <View style={styles.center}>
          <IconButton icon="bookshelf" size={80} iconColor="#333" />
          <Text variant="headlineSmall" style={{ color: '#666', textAlign: 'center' }}>
            {searchQuery ? 'No se encontraron libros' : 'Tu biblioteca está vacía'}
          </Text>
          {!searchQuery && (
            <Text variant="bodyMedium" style={{ color: '#444', marginTop: 10, textAlign: 'center' }}>
              Descarga libros desde la pestaña de búsqueda para verlos aquí.
            </Text>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredBooks}
          keyExtractor={item => item.id.toString()}
          renderItem={renderBookItem}
          contentContainerStyle={styles.list}
        />
      )}

      <Portal>
        <FAB
          icon="file-search-outline"
          label="Sincronizar móvil"
          style={styles.fab}
          onPress={handleScan}
          loading={scanning}
          disabled={scanning}
          visible={!loading}
        />
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchbar: { margin: 16, elevation: 2 },
  list: { padding: 16, paddingBottom: 80 },
  card: { marginBottom: 12, elevation: 1 },
  cardContent: { flexDirection: 'row', padding: 8, alignItems: 'center' },
  thumbnail: { width: 60, height: 90, borderRadius: 4 },
  audioBadge: { 
    position: 'absolute', 
    bottom: -5, 
    right: -5, 
    backgroundColor: '#FF9800', 
    borderRadius: 15,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3
  },
  bookInfo: { flex: 1, marginLeft: 12, justifyContent: 'center' },
  title: { fontWeight: 'bold' },
  author: { opacity: 0.7 },
  actions: { flexDirection: 'column', alignItems: 'center' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#6200ee'
  }
});
