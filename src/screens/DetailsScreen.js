import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Image, Alert, Linking, Platform } from 'react-native';
import { Text, Button, useTheme, ActivityIndicator, Divider, TouchableRipple } from 'react-native-paper';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { LibraryService } from '../services/libraryService';
import { AudiobookService } from '../services/audiobookService';

export default function DetailsScreen({ route, navigation }) {
  const { book } = route.params;
  const theme = useTheme();
  
  // State
  const [downloading, setDownloading] = useState(false);
  const [downloadingAudio, setDownloadingAudio] = useState(false);
  const [description, setDescription] = useState(book.description || '');
  const [loadingDesc, setLoadingDesc] = useState(false);
  const [audiobook, setAudiobook] = useState(null);
  const [loadingAudio, setLoadingAudio] = useState(false);

  const authorName = book.authors.length > 0 ? book.authors.map(a => a.name).join(', ') : 'Desconocido';

  useEffect(() => {
    fetchMetadata();
  }, [book.title, book.description, authorName]);

  const fetchMetadata = async () => {
    // 1. Fetch wiki description if missing
    if (!description && !book.description) {
      setLoadingDesc(true);
      try {
        // Limpiamos el título para una mejor búsqueda en Wikipedia
        const cleanTitle = book.title.split('/')[0].split(':')[0].split('(')[0].trim();
        const searchQuery = `${cleanTitle} ${authorName !== 'Desconocido' ? authorName.split(',')[0] : ''}`.trim();
        const wikiSearchUrl = `https://es.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchQuery)}&format=json&origin=*`;
        
        const res = await fetch(wikiSearchUrl);
        const data = await res.json();
        
        if (data.query.search.length > 0) {
          // Buscamos la mejor coincidencia que mencione "libro", "novela" o al autor
          const bestMatch = data.query.search.find(s => 
            s.snippet.toLowerCase().includes('libro') || 
            s.snippet.toLowerCase().includes('novela') || 
            s.title.toLowerCase().includes(cleanTitle.toLowerCase())
          ) || data.query.search[0];

          const pageTitle = bestMatch.title;
          const wikiExtractUrl = `https://es.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=true&explaintext=true&titles=${encodeURIComponent(pageTitle)}&format=json&origin=*`;
          const extractRes = await fetch(wikiExtractUrl);
          const extractData = await extractRes.json();
          
          const pages = extractData.query.pages;
          const pageId = Object.keys(pages)[0];
          if (pageId !== '-1' && pages[pageId].extract) {
            setDescription(pages[pageId].extract);
          } else {
            setDescription('Sinopsis no disponible para esta edición.');
          }
        } else {
          setDescription('No se encontraron resultados en Wikipedia.');
        }
      } catch (e) {
        setDescription('No se pudo cargar la sinopsis automáticamente.');
      } finally {
        setLoadingDesc(false);
      }
    }

    // 2. Search for audiobook version
    setLoadingAudio(true);
    try {
      const match = await AudiobookService.findBestMatch(book);
      setAudiobook(match);
    } catch (err) {
      console.error("Audiobook search failed:", err);
    } finally {
      setLoadingAudio(false);
    }
  };

  // Determine book download URL
  let downloadUrl = null;
  if (book.isDownloadable) {
    if (book.gutendexBook) {
      const formats = book.gutendexBook.formats;
      downloadUrl = formats['application/epub+zip'] || formats['application/pdf'] || formats['text/plain; charset=utf-8'];
    } else if (book.accessInfo?.publicDomain) {
      downloadUrl = book.accessInfo.epub?.downloadLink || book.accessInfo.pdf?.downloadLink;
    } else if (book.archiveId) {
      downloadUrl = `https://archive.org/download/${book.archiveId}/${book.archiveId}.pdf`;
    }
  }

  // Force HTTPS for known domains
  if (downloadUrl && downloadUrl.startsWith('http:')) {
    downloadUrl = downloadUrl.replace('http:', 'https:');
  }

  const handleDownload = async () => {
    if (!downloadUrl) {
      Alert.alert('Aviso', 'Este libro no tiene digitalización legal gratuita disponible.');
      return;
    }

    setDownloading(true);
    try {
      let finalUrl = downloadUrl;

      // Si es de Internet Archive, verificamos el archivo real antes de descargar
      if (book.archiveId && !book.gutendexBook) {
        try {
          const metaRes = await fetch(`https://archive.org/metadata/${book.archiveId}`);
          const metaData = await metaRes.json();
          const files = metaData.files || [];
          
          // Buscamos PDF, EPUB o MOBI en ese orden
          const bestFile = files.find(f => f.name.endsWith('.pdf')) || 
                           files.find(f => f.name.endsWith('.epub')) || 
                           files.find(f => f.name.endsWith('.mobi'));
          
          if (bestFile) {
            finalUrl = `https://archive.org/download/${book.archiveId}/${bestFile.name}`;
          }
        } catch (err) {
          console.warn("Error fetching IA metadata, using fallback URL");
        }
      }

      if (!finalUrl) throw new Error("No download URL available");

      if (Platform.OS === 'web') {
        Linking.openURL(finalUrl);
        await LibraryService.addBook(book, finalUrl);
        Alert.alert('Éxito', 'Libro añadido a tu biblioteca (web preview).');
      } else {
        // Detect extension
        let extension = '.txt';
        const lowerUrl = finalUrl.toLowerCase();
        if (lowerUrl.endsWith('.epub')) extension = '.epub';
        else if (lowerUrl.endsWith('.pdf')) extension = '.pdf';
        else if (lowerUrl.endsWith('.mobi')) extension = '.mobi';
        
        const filename = `${book.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}${extension}`;
        const fileUri = `${FileSystem.documentDirectory}${filename}`;
        
        const downloadRes = await FileSystem.downloadAsync(finalUrl, fileUri);
        if (downloadRes.status !== 200) {
          throw new Error(`Server returned ${downloadRes.status}`);
        }

        await LibraryService.addBook(book, downloadRes.uri);
        Alert.alert('Éxito', 'Libro guardado en tu biblioteca.', [
          { text: 'Ir a Biblioteca', onPress: () => navigation.navigate('LibraryTab') },
          { text: 'OK' }
        ]);
      }
    } catch (e) {
      console.error("Download error:", e);
      Alert.alert('Error', `No se pudo descargar el libro: ${e.message || 'Error de conexión'}`);
    } finally {
      setDownloading(false);
    }
  };

  const handleAudioDownload = async () => {
    if (!audiobook) return;
    
    setDownloadingAudio(true);
    let audioUrl = audiobook.zip_url || audiobook.download_url || audiobook.url;

    // Force HTTPS
    if (audioUrl && audioUrl.startsWith('http:')) {
      audioUrl = audioUrl.replace('http:', 'https:');
    }
    try {
      if (Platform.OS === 'web') {
        Linking.openURL(audioUrl);
      }
      
      const audioBookMeta = { 
        ...book, 
        title: `${book.title} (Audio)`, 
        isAudio: true,
        authors: [{ name: audiobook.author || authorName }] 
      };

      if (Platform.OS === 'web') {
        await LibraryService.addBook(audioBookMeta, audioUrl);
        Alert.alert('Éxito', 'Audiolibro añadido a tu biblioteca (web preview).');
      } else {
        const filename = `${book.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_audio.mp3`;
        const fileUri = `${FileSystem.documentDirectory}${filename}`;
        const { uri } = await FileSystem.downloadAsync(audioUrl, fileUri);
        await LibraryService.addBook(audioBookMeta, uri);
        Alert.alert('Éxito', 'Audiolibro guardado en tu biblioteca.');
      }
    } catch (e) {
      Alert.alert('Error', 'No se pudo descargar el audiolibro.');
    } finally {
      setDownloadingAudio(false);
    }
  };

  // Helper for authors and saga
  const handleAuthorSearch = () => navigation.push('Results', { query: authorName, authorFilter: authorName });
  const handleSagaSearch = () => {
    let sagaQuery = book.title.split(':')[0].split('-')[0].trim();
    const parenthesisMatch = book.title.match(/\((.*?)\)/);
    if (parenthesisMatch) sagaQuery = parenthesisMatch[1].replace(/[0-9,.-]/g, '').replace(/volumen|vol|libro/gi, '').trim();
    navigation.push('Results', { query: sagaQuery, authorFilter: authorName });
  };

  const subjectsStr = book.subjects?.slice(0, 5).map(s => s.split(' -- ')[0]).join(', ') || 'No especificado';

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.imageContainer}>
        {book.coverUrl ? (
          <Image source={{ uri: book.coverUrl }} style={styles.cover} resizeMode="contain" />
        ) : (
          <View style={[styles.cover, { backgroundColor: '#333', justifyContent: 'center', alignItems: 'center' }]}>
            <Text style={{color: '#999'}}>Sin Portada</Text>
          </View>
        )}
      </View>
      
      <View style={styles.content}>
        <View style={[styles.infobox, { borderColor: theme.colors.outline, backgroundColor: theme.colors.surfaceVariant }]}>
          <View style={[styles.infoboxHeader, { backgroundColor: theme.colors.primaryContainer }]}>
            <Text variant="titleLarge" style={[styles.infoboxTitle, { color: theme.colors.onPrimaryContainer }]}>
              {book.title}
            </Text>
            <TouchableRipple onPress={handleAuthorSearch} style={styles.authorLinkBtn}>
              <Text variant="bodyMedium" style={[styles.authorLinkTxt, { color: theme.colors.onPrimaryContainer }]}>
                de {authorName} 🔍
              </Text>
            </TouchableRipple>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Género</Text>
            <Text style={[styles.infoValue, { color: theme.colors.primary }]}>{subjectsStr}</Text>
          </View>
          <Divider />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Publicación</Text>
            <Text style={styles.infoValue}>{book.firstPublishYear}</Text>
          </View>
          <Divider />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Estado</Text>
            <Text style={[styles.infoValue, { fontWeight: 'bold', color: book.isDownloadable ? '#4CAF50' : '#F44336' }]}>
              {book.isDownloadable ? 'Dominio Público' : 'Copyright'}
            </Text>
          </View>
        </View>

        <Text variant="titleLarge" style={styles.sectionTitle}>Sinopsis</Text>
        <Divider style={styles.sectionDivider} />
        
        {loadingDesc ? (
          <ActivityIndicator style={{ marginVertical: 30 }} />
        ) : (
          <Text variant="bodyLarge" style={styles.description}>
            {description || 'No hay descripción disponible para este ejemplar.'}
          </Text>
        )}
        
        <View style={styles.drilldownRow}>
          <Button mode="outlined" icon="account-search" onPress={handleAuthorSearch} style={styles.drilldownBtn} labelStyle={{ fontSize: 10 }}>
            Toda la Obra
          </Button>
          <Button mode="outlined" icon="bookshelf" onPress={handleSagaSearch} style={styles.drilldownBtn} labelStyle={{ fontSize: 10 }}>
            Ver esta Saga
          </Button>
        </View>

        <View style={styles.actionColumn}>
          <View style={styles.mainButtonsRow}>
            {book.isDownloadable && (
              <Button 
                mode="contained" 
                icon="download" 
                onPress={handleDownload}
                loading={downloading}
                disabled={downloading}
                style={[styles.button, { flex: 1, marginRight: book.previewLink ? 4 : 0 }]}
                labelStyle={{ fontSize: 10 }}
              >
                {downloading ? 'Descargando...' : 'Descargar PDF/EPUB'}
              </Button>
            )}
            
            {book.previewLink && (
              <Button 
                mode="contained-tonal" 
                icon="open-in-new" 
                onPress={() => Linking.openURL(book.previewLink)}
                style={[styles.button, { flex: 1, marginLeft: book.isDownloadable ? 4 : 0 }]}
                labelStyle={{ fontSize: 10 }}
              >
                Ver online
              </Button>
            )}
          </View>

          {loadingAudio ? (
            <ActivityIndicator size="small" style={{ marginVertical: 10 }} />
          ) : audiobook && (
            <Button 
              mode="contained" 
              icon="headphones" 
              onPress={handleAudioDownload}
              loading={downloadingAudio}
              disabled={downloadingAudio}
              style={[styles.button, { backgroundColor: '#FF9800' }]}
              labelStyle={{ fontSize: 10, color: '#fff' }}
            >
              {`Descargar Audiolibro (${audiobook.source})`}
            </Button>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  imageContainer: { width: '100%', height: 250, backgroundColor: '#1E1E1E', justifyContent: 'center', alignItems: 'center', paddingVertical: 10 },
  cover: { width: 160, height: 230, borderRadius: 4 },
  content: { padding: 20 },
  infobox: { borderWidth: 1, borderRadius: 8, marginBottom: 30, overflow: 'hidden' },
  infoboxHeader: { padding: 16, alignItems: 'center' },
  infoboxTitle: { fontWeight: 'bold', textAlign: 'center', fontStyle: 'italic' },
  authorLinkBtn: { marginTop: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, backgroundColor: 'rgba(0,0,0,0.1)' },
  authorLinkTxt: { fontStyle: 'italic', fontWeight: 'bold' },
  infoRow: { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 16 },
  infoLabel: { fontWeight: 'bold', width: '40%' },
  infoValue: { flex: 1 },
  sectionTitle: { fontWeight: 'bold', marginBottom: 8 },
  sectionDivider: { marginBottom: 16 },
  description: { marginBottom: 30, opacity: 0.9, lineHeight: 24, textAlign: 'justify' },
  drilldownRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  drilldownBtn: { flex: 1, marginHorizontal: 4, borderWidth: 1 },
  actionColumn: { flexDirection: 'column', gap: 10 },
  mainButtonsRow: { flexDirection: 'row', justifyContent: 'center' },
  button: { paddingVertical: 8, borderRadius: 8, elevation: 2 }
});
