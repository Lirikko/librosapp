import React from 'react';
import { Provider as PaperProvider, MD3DarkTheme, MD3LightTheme } from 'react-native-paper';
import { ThemeProvider, useAppTheme } from './src/context/ThemeContext';
import { NavigationContainer, DarkTheme as NavigationDarkTheme, DefaultTheme as NavigationDefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import HomeScreen from './src/screens/HomeScreen';
import ResultsScreen from './src/screens/ResultsScreen';
import DetailsScreen from './src/screens/DetailsScreen';
import LibraryScreen from './src/screens/LibraryScreen';
import AudioLibraryScreen from './src/screens/AudioLibraryScreen';
import ReaderScreen from './src/screens/ReaderScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import AudioPlayerScreen from './src/screens/AudioPlayerScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const darkPaperTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#BB86FC',
    background: '#121212',
    surface: '#1E1E1E',
  },
};

const lightPaperTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#6200ee',
    background: '#ffffff',
    surface: '#f5f5f5',
  },
};

function SearchStack() {
  return (
    <Stack.Navigator 
      initialRouteName="SearchHome"
      screenOptions={{
        headerStyle: { backgroundColor: '#1E1E1E' },
        headerTintColor: '#fff',
      }}
    >
      <Stack.Screen name="SearchHome" component={HomeScreen} options={{ title: 'Buscador' }} />
      <Stack.Screen name="Results" component={ResultsScreen} options={{ title: 'Resultados' }} />
      <Stack.Screen name="Details" component={DetailsScreen} options={{ title: 'Detalles' }} />
    </Stack.Navigator>
  );
}

function LibraryStack() {
  return (
    <Stack.Navigator 
      initialRouteName="LibraryHome"
      screenOptions={{
        headerStyle: { backgroundColor: '#1E1E1E' },
        headerTintColor: '#fff',
      }}
    >
      <Stack.Screen name="LibraryHome" component={LibraryScreen} options={{ title: 'Libros' }} />
      <Stack.Screen name="Reader" component={ReaderScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

function AudioLibraryStack() {
  return (
    <Stack.Navigator 
      initialRouteName="AudioLibraryHome"
      screenOptions={{
        headerStyle: { backgroundColor: '#1E1E1E' },
        headerTintColor: '#fff',
      }}
    >
      <Stack.Screen name="AudioLibraryHome" component={AudioLibraryScreen} options={{ title: 'Audiolibros' }} />
      <Stack.Screen name="AudioPlayer" component={AudioPlayerScreen} options={{ headerShown: false, presentation: 'modal' }} />
    </Stack.Navigator>
  );
}

function MainApp() {
  const { isDarkMode } = useAppTheme();
  
  const paperTheme = isDarkMode ? darkPaperTheme : lightPaperTheme;
  const navigationTheme = isDarkMode ? NavigationDarkTheme : NavigationDefaultTheme;

  return (
    <PaperProvider theme={paperTheme}>
      <NavigationContainer theme={navigationTheme}>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            tabBarIcon: ({ color, size }) => {
              let iconName;
              if (route.name === 'LibraryTab') {
                iconName = 'book-open-variant';
              } else if (route.name === 'AudioTab') {
                iconName = 'headphones';
              } else if (route.name === 'SearchTab') {
                iconName = 'magnify';
              } else if (route.name === 'SettingsTab') {
                iconName = 'cog';
              }
              return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
            },
            tabBarActiveTintColor: paperTheme.colors.primary,
            tabBarInactiveTintColor: 'gray',
            tabBarStyle: { backgroundColor: paperTheme.colors.surface, borderTopWidth: 0 },
            headerShown: false,
          })}
        >
          <Tab.Screen name="LibraryTab" component={LibraryStack} options={{ title: 'Libros' }} />
          <Tab.Screen name="AudioTab" component={AudioLibraryStack} options={{ title: 'Audio' }} />
          <Tab.Screen name="SearchTab" component={SearchStack} options={{ title: 'Buscar' }} />
          <Tab.Screen name="SettingsTab" component={SettingsScreen} options={{ title: 'Ajustes' }} />
        </Tab.Navigator>
      </NavigationContainer>
    </PaperProvider>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <MainApp />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
