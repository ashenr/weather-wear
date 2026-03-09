import { Box } from '@chakra-ui/react'
import { Header } from './Header'
import { BottomNav } from './BottomNav'

export function Layout({ children }: React.PropsWithChildren) {
  return (
    <Box minH="100vh">
      <Header />
      <Box as="main" pb={{ base: '64px', md: 0 }}>
        {children}
      </Box>
      <BottomNav />
    </Box>
  )
}
