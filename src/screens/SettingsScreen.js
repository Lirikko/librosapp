import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform, Linking } from 'react-native';
import { Text, List, Divider, useTheme, Button, IconButton, Switch } from 'react-native-paper';
import Constants from 'expo-constants';
import { ScannerService } from '../services/scannerService';
import { LibraryService } from '../services/libraryService';
import { useAppTheme } from '../context/ThemeContext';

export default function SettingsScreen() {
  const theme = useTheme();
  const { isDarkMode, toggleTheme } = useAppTheme();
  const [scanning, setScanning] = useState(false);

  const version = Constants.expoConfig?.version || '1.0.0';
  const runtimeVersion = Constants.expoConfig?.runtimeVersion || 'N/A';

  const handleScan = async () => {
    setScanning(true);
    try {
      const results = await ScannerService.scanStorage();
      const allFound = [...results.books, ...results.audio];
      
      if (allFound.length === 0) {
        Alert.alert(
          'Escaneo Finalizado', 
          'No se encontraron archivos compatibles.\n\nIMPORTANTE: En Android 11 o superior, debes otorgar el permiso "Acceso a todos los archivos" en los Ajustes del sistema para que esta función pueda trabajar.',
          [
            { text: 'Entendido', style: 'default' },
            { 
              text: 'Ajustes', 
              onPress: () => {
                if (Platform.OS === 'android') {
                  Linking.openSettings();
                }
              }
            }
          ]
        );
      } else {
        let addedCount = 0;
        for (const item of allFound) {
           await LibraryService.addBook(item, item.uri);
           addedCount++;
        }
        Alert.alert('Escaneo Finalizado', `Se han sincronizado ${addedCount} archivos con tu biblioteca.`);
      }
    } catch (e) {
      Alert.alert('Error', 'No se pudo realizar el escaneo. Asegúrate de que la app tiene permisos de almacenamiento.');
    } finally {
      setScanning(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
        <IconButton icon="cog" size={40} iconColor={theme.colors.primary} />
        <Text variant="headlineMedium">Ajustes</Text>
      </View>

      <List.Section>
        <List.Subheader>Personalización</List.Subheader>
        <List.Item
          title="Modo Oscuro"
          description="Alternar entre tema claro y oscuro"
          left={props => <List.Icon {...props} icon="brightness-6" />}
          right={() => (
            <Switch 
              value={isDarkMode} 
              onValueChange={toggleTheme} 
              color={theme.colors.primary} 
            />
          )}
        />
      </List.Section>

      <Divider />

      <List.Section>
        <List.Subheader>Información de la App</List.Subheader>
        <List.Item
          title="Versión de la aplicación"
          description={version}
          left={props => <List.Icon {...props} icon="information-outline" />}
        />
        <List.Item
          title="Versión del motor (Runtime)"
          description={runtimeVersion}
          left={props => <List.Icon {...props} icon="engine-outline" />}
        />
      </List.Section>

      <Divider />

      <List.Section>
        <List.Subheader>Sincronización y Almacenamiento</List.Subheader>
        <List.Item
          title="Sincronizar móvil"
          description="Busca libros y audiolibros descargados en tu dispositivo"
          left={props => <List.Icon {...props} icon="file-search-outline" />}
          onPress={handleScan}
          right={() => scanning ? <Button loading={true} disabled={true}>Escaneando...</Button> : <List.Icon icon="chevron-right" />}
        />
        <List.Item
          title="Permisos del sistema"
          description="Abrir ajustes para gestionar permisos de archivos"
          left={props => <List.Icon {...props} icon="shield-check-outline" />}
          onPress={() => Linking.openSettings()}
        />
        <List.Item
          title="Limpiar Biblioteca"
          description="Eliminar todos los libros y datos guardados"
          descriptionStyle={{ color: theme.colors.error }}
          left={props => <List.Icon {...props} icon="delete-sweep-outline" color={theme.colors.error} />}
          onPress={() => {
            Alert.alert(
              'Limpiar Todo',
              '¿Estás seguro? Esto eliminará todos los libros de tu biblioteca y el progreso de lectura.',
              [
                { text: 'Cancelar', style: 'cancel' },
                { 
                  text: 'Limpiar', 
                  style: 'destructive', 
                  onPress: async () => {
                    await AsyncStorage.clear();
                    Alert.alert('Completado', 'Se han borrado todos los datos. La app se reiniciará.');
                  } 
                }
              ]
            );
          }}
        />
      </List.Section>

      <Divider />

      <View style={styles.footer}>
        <Text variant="bodySmall" style={styles.footerText}>
          LibrosApp © 2024 - Lectura y Audio Legal
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: '#1E1E1E',
    marginBottom: 10,
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    opacity: 0.5,
  }
});
