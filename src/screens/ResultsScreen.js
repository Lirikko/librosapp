import React, { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Text, ActivityIndicator, Card, useTheme, Button } from 'react-native-paper';
import { searchBooks } from '../services/api';
import { CardSkeleton } from '../components/Skeleton';

export default function ResultsScreen({ route, navigation }) {
  const { query, authorFilter } = route.params;
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const theme = useTheme();

  useEffect(() => {
    // Ahora pasamos opcionalmente el autor para forzar el filtro estricto
    searchBooks(query, authorFilter).then(data => {
      setResults(data);
      setLoading(false);
    });
  }, [query, authorFilter]);

  const renderItem = ({ item }) => {
    const authorName = item.authors.length > 0 ? item.authors[0].name : 'Desconocido';
    
    return (
      <TouchableOpacity onPress={() => navigation.navigate('Details', { book: item })}>
        <Card style={styles.card}>
          <View style={styles.cardContent}>
            {item.coverUrl ? (
               <Image source={{ uri: item.coverUrl }} style={styles.cover} resizeMode="cover" />
            ) : (
               <View style={[styles.cover, { alignItems: 'center', justifyContent: 'center' }]}>
                 <Text style={{color: '#888', fontSize: 10, textAlign:'center'}}>Sin Portada</Text>
               </View>
            )}
            <View style={styles.textContainer}>
              <Text variant="titleMedium" numberOfLines={2} style={styles.bookTitle}>{item.title}</Text>
              <Text variant="bodyMedium" numberOfLines={1}>{authorName}</Text>
              <Text variant="bodySmall" style={{ opacity: 0.6, marginTop: 4 }}>Año: {item.firstPublishYear}</Text>
            </View>
            <View style={styles.actionContainer}>
              {item.isDownloadable ? (
                 <Button mode="contained-tonal" compact icon="download" labelStyle={{ fontSize: 10 }}>Disponible</Button>
              ) : (
                 <Button mode="text" compact icon="close" textColor="gray" labelStyle={{ fontSize: 10 }}>No Libre</Button>
              )}
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <FlatList
          data={[1, 2, 3, 4, 5]}
          keyExtractor={(item) => item.toString()}
          renderItem={() => <CardSkeleton />}
          contentContainerStyle={styles.list}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {results.length === 0 ? (
        <View style={styles.center}>
          <Text variant="titleMedium">No se encontraron libros en español.</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16 },
  card: {
    marginBottom: 16,
    overflow: 'hidden',
  },
  cardContent: {
    flexDirection: 'row',
  },
  cover: {
    width: 60,
    height: 90,
    backgroundColor: '#333'
  },
  textContainer: {
    flex: 1,
    padding: 12,
    justifyContent: 'center'
  },
  bookTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  actionContainer: {
    justifyContent: 'center',
    paddingRight: 8
  }
});
