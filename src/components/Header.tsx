import { Box, Flex, Heading, HStack, Link, Text } from '@chakra-ui/react'
import { Link as RouterLink, useLocation } from 'react-router-dom'
import { FiLogOut } from 'react-icons/fi'
import { useAuth } from '../contexts/AuthContext'
import { BrandLogo } from './BrandLogo'
import { APP_NAME } from '../config'

function NavLink({ to, label }: { to: string; label: string }) {
  const { pathname } = useLocation()
  const isActive = pathname === to || (to !== '/' && pathname.startsWith(to))

  return (
    <Link asChild>
      <RouterLink to={to}>
        <Text
          fontSize="sm"
          fontWeight={isActive ? 'bold' : 'medium'}
          color={isActive ? 'brand.navy' : 'fg.muted'}
          _hover={{ color: 'brand.slate' }}
          textTransform="uppercase"
          letterSpacing="widest"
        >
          {label}
        </Text>
      </RouterLink>
    </Link>
  )
}

export function Header() {
  const { user, signOut } = useAuth()
  
  const displayName = user?.displayName || user?.email?.split('@')[0] || 'User'
  const initial = displayName.charAt(0).toUpperCase()

  return (
    <Flex
      as="header"
      px={5}
      py={4}
      bg="rgba(255, 255, 255, 0.85)"
      backdropFilter="blur(12px)"
      borderBottomWidth="1px"
      borderColor="blackAlpha.100"
      align="center"
      justify="space-between"
      position="sticky"
      top={0}
      zIndex="banner"
    >
      <HStack gap={6}>
        <HStack gap={3}>
          <BrandLogo />
          <Heading size="lg" color="brand.navy" letterSpacing="tighter" fontWeight="bold">
            {APP_NAME}
          </Heading>
        </HStack>
        {user && (
          <HStack gap={4} hideBelow="md">
            <NavLink to="/" label="Dashboard" />
            <NavLink to="/wardrobe" label="Wardrobe" />
            <NavLink to="/feedback" label="Log Feedback" />
          </HStack>
        )}
      </HStack>
      
      {user && (
        <HStack gap={4}>
          <Flex align="center" gap={3}>
            <Text fontSize="sm" color="brand.navy" fontWeight="semibold" hideBelow="sm">
              {displayName}
            </Text>
            <Flex 
              w="36px" 
              h="36px" 
              borderRadius="full" 
              bg="brand.navy" 
              color="white" 
              align="center" 
              justify="center" 
              fontWeight="bold"
              fontSize="sm"
              boxShadow="sm"
            >
              {initial}
            </Flex>
          </Flex>

          <Box w="1px" h="20px" bg="gray.200" />
          
          <Flex
            as="button"
            onClick={signOut}
            color="fg.muted"
            p={2}
            borderRadius="full"
            transition="all 0.2s"
            _hover={{ color: 'red.500', bg: 'red.50' }}
            aria-label="Sign out"
          >
            <FiLogOut size={20} strokeWidth={2.5} />
          </Flex>
        </HStack>
      )}
    </Flex>
  )
}
