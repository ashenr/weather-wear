import { Button, Flex, Heading, Text } from '@chakra-ui/react'
import { useAuth } from '../contexts/AuthContext'

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
      <Heading size="md">Smart Display</Heading>
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
