import { Button, Flex, Heading, HStack, Link, Text } from '@chakra-ui/react'
import { Link as RouterLink, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

function NavLink({ to, label }: { to: string; label: string }) {
  const { pathname } = useLocation()
  const isActive = pathname === to || (to !== '/' && pathname.startsWith(to))

  return (
    <Link asChild>
      <RouterLink to={to}>
        <Text
          fontSize="sm"
          fontWeight={isActive ? 'semibold' : 'normal'}
          color={isActive ? 'blue.500' : 'fg.muted'}
          _hover={{ color: 'fg' }}
        >
          {label}
        </Text>
      </RouterLink>
    </Link>
  )
}

export function Header() {
  const { user, signOut } = useAuth()

  return (
    <Flex
      as="header"
      px={4}
      py={3}
      borderBottomWidth="1px"
      align="center"
      justify="space-between"
    >
      <HStack gap={6}>
        <Heading size="md">Smart Display</Heading>
        {user && (
          <HStack gap={4} hideBelow="md">
            <NavLink to="/" label="Dashboard" />
            <NavLink to="/wardrobe" label="Wardrobe" />
            <NavLink to="/feedback" label="Log Feedback" />
          </HStack>
        )}
      </HStack>
      <Flex align="center" gap={3}>
        {user && (
          <Text fontSize="sm" color="fg.muted">
            {user.email}
          </Text>
        )}
        <Button onClick={signOut} variant="ghost" size="sm">
          Sign out
        </Button>
      </Flex>
    </Flex>
  )
}
