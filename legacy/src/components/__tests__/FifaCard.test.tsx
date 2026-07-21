import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { FifaCard } from '../FifaCard'

// Mock de lucide-react pour éviter les erreurs de rendu d'icônes dans le test
vi.mock('lucide-react', () => ({
  Shield: () => <div data-testid="shield-icon" />,
  X: () => <div data-testid="close-icon" />,
  Share2: () => <div data-testid="share-icon" />,
}))

describe('FifaCard', () => {
  const defaultProps = {
    name: 'COMMANDANT',
    team: 'MON CLUB',
    score: 85,
    label: 'GRADE',
    stats: [{ label: 'DOC', value: 80 }]
  }

  it('doit afficher le nom, le score et le club du joueur', () => {
    render(<FifaCard {...defaultProps} />)

    expect(screen.getByText('COMMANDANT')).toBeInTheDocument()
    expect(screen.getByText('85')).toBeInTheDocument()
    expect(screen.getByText('MON CLUB')).toBeInTheDocument()
    expect(screen.getByText('GRADE')).toBeInTheDocument()
  })

  it('doit afficher les statistiques transmises', () => {
    render(<FifaCard {...defaultProps} />)

    expect(screen.getByText('80')).toBeInTheDocument()
    expect(screen.getByText('DOC')).toBeInTheDocument()
  })

  it('doit afficher le bouton de fermeture si la fonction onClose est fournie', () => {
    const onCloseMock = vi.fn()
    render(<FifaCard {...defaultProps} onClose={onCloseMock} />)

    const closeButton = screen.getByTestId('close-icon').parentElement
    expect(closeButton).toBeInTheDocument()
  })
})
