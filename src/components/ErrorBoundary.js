import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

/**
 * Error Boundary: cattura errori non gestiti nell'albero React e mostra una UI di fallback
 * invece della schermata rossa di crash (audit 4.3).
 * Su web mostra anche il messaggio di errore per capire la causa della pagina bianca.
 */
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch() {}

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const err = this.state.error;
      const errMsg = err && (err.message || String(err));
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Qualcosa è andato storto</Text>
          <Text style={styles.message}>
            L'app ha riscontrato un errore inatteso. Puoi riprovare.
          </Text>
          {errMsg ? (
            <ScrollView style={styles.errorScroll} contentContainerStyle={styles.errorScrollContent}>
              <Text style={styles.errorDetail} selectable>{errMsg}</Text>
            </ScrollView>
          ) : null}
          <TouchableOpacity style={styles.button} onPress={this.handleRetry} activeOpacity={0.8}>
            <Text style={styles.buttonText}>Riprova</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#002b4d',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#c5a059',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: '#d1d1d1',
    textAlign: 'center',
    marginBottom: 24,
  },
  errorScroll: { maxHeight: 180, width: '100%', marginBottom: 16 },
  errorScrollContent: { padding: 12 },
  errorDetail: {
    fontSize: 12,
    color: '#ff6b6b',
    textAlign: 'left',
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  button: {
    backgroundColor: '#c5a059',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#0a0a0a',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ErrorBoundary;
