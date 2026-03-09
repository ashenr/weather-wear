import { Component } from 'react'
import { Box, Button, Text, VStack } from '@chakra-ui/react'

interface Props {
  children: React.ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box maxW="600px" mx="auto" px={4} py={16} textAlign="center">
          <VStack gap={4}>
            <Text fontSize="xl" fontWeight="semibold">
              Something went wrong
            </Text>
            <Text color="fg.muted">
              {this.state.error?.message ?? 'An unexpected error occurred.'}
            </Text>
            <Button onClick={() => this.setState({ hasError: false, error: null })}>
              Try again
            </Button>
          </VStack>
        </Box>
      )
    }

    return this.props.children
  }
}
