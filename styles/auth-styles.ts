import { StyleSheet } from 'react-native';

export const authStyles = StyleSheet.create({
  // Container & Layout
  gradient: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 40,
  },
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 24,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },

  // Logo
  logoContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  logo: {
    width: 180,
    height: 130,
    resizeMode: 'contain',
  },
  logoSmall: {
    width: 160,
    height: 115,
    resizeMode: 'contain',
  },

  // Typography
  title: {
    marginBottom: 8,
    textAlign: 'center',
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  subtitle: {
    textAlign: 'center',
    fontSize: 15,
    color: '#666',
    marginBottom: 32,
  },
  subtitleSmall: {
    textAlign: 'center',
    fontSize: 15,
    color: '#666',
    marginBottom: 28,
  },

  // Input Fields
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    height: 54,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 16,
  },
  inputContainerSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    height: 54,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    marginBottom: 14,
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 16,
  },
  inputContainerFocused: {
    borderColor: '#667eea',
    backgroundColor: '#ffffff',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1a1a1a',
  },
  eyeIcon: {
    padding: 4,
  },

  // Forgot Password
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: '#667eea',
    fontSize: 14,
    fontWeight: '600',
  },

  // Buttons
  buttonWrapper: {
    width: '100%',
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonWrapperGreen: {
    width: '100%',
    marginTop: 8,
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#43A047',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  button: {
    width: '100%',
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#999',
    fontSize: 14,
    fontWeight: '500',
  },

  // Social Buttons
  socialButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 12,
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  facebookButton: {
    backgroundColor: '#1877f2',
  },
  googleButton: {
    backgroundColor: '#ea4335',
  },
  socialButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },

  // Bottom Text
  bottomText: {
    flexDirection: 'row',
    marginTop: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  bottomTextSmall: {
    flexDirection: 'row',
    marginTop: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  bottomTextGray: {
    color: '#666',
    fontSize: 15,
  },
  linkText: {
    color: '#667eea',
    fontSize: 15,
    fontWeight: '700',
  },
});

export const gradientColors = {
  background: ['#667eea', '#764ba2', '#f093fb'] as const,
  loginButton: ['#667eea', '#764ba2'] as const,
  registerButton: ['#43A047', '#66BB6A'] as const,
};