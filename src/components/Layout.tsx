import { Box } from '@chakra-ui/react'
import { Header } from './Header'

export function Layout({ children }: React.PropsWithChildren) {
  return (
    <Box minH="100vh">
      <Header />
      <Box as="main">{children}</Box>
    </Box>
  )
}
