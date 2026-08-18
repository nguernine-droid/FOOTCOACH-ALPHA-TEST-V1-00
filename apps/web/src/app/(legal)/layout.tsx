import { VitrineShell } from "@/components/public/VitrineShell";

/**
 * Les pages légales portent la même coquille que le reste de la vitrine.
 *
 * Un groupe de routes (les parenthèses) plutôt qu'un segment d'URL : les
 * adresses restent `/mentions-legales`, `/cgu` et `/confidentialite`, sans
 * préfixe. C'est ce qui permet de leur donner un layout commun sans allonger
 * des liens qu'on écrit sur des documents papier et qu'on dicte au téléphone.
 */
export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return <VitrineShell>{children}</VitrineShell>;
}
