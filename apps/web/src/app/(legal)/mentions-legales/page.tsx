import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT, EDITOR, HOST, LEGAL_VERSIONS, PUBLICATION_DIRECTORS, legalIsComplete } from "@/lib/legal";
import { ContactCard, IncompleteNotice, LegalPage, Value } from "@/components/public/LegalPage";

const complete = legalIsComplete();

export const metadata: Metadata = {
  title: "Mentions légales — TeamNexus",
  description: "Éditeur, directeur de publication, hébergeur et propriété intellectuelle du site TeamNexus.",
  alternates: { canonical: "/mentions-legales" },
  // Tant que l'identification exigée par la LCEN n'est pas complète, la page
  // reste accessible mais n'est pas proposée aux moteurs : une mention légale
  // à trous indexée vaut moins que pas de mention indexée du tout.
  robots: { index: complete, follow: true },
};

const TOC = [
  { id: "editeur", label: "Éditeur" },
  { id: "publication", label: "Directeur de la publication" },
  { id: "hebergeur", label: "Hébergeur" },
  { id: "propriete", label: "Propriété intellectuelle" },
  { id: "liens", label: "Liens et services tiers" },
  { id: "signalement", label: "Signaler un contenu" },
  { id: "donnees", label: "Données personnelles" },
];

export default function MentionsLegales() {
  return (
    <LegalPage
      eyebrow="Informations légales"
      title="Mentions légales"
      lede="Qui édite ce site et l'application TeamNexus, qui l'héberge, et comment nous joindre."
      updated={LEGAL_VERSIONS.mentions.updated}
      version={LEGAL_VERSIONS.mentions.version}
      toc={TOC}
    >
      {!complete && <IncompleteNotice />}

      <h2 id="editeur">1. Éditeur du site et de l&apos;application</h2>
      <p>
        Le site <b>teamnexus.fr</b> et l&apos;application TeamNexus sont édités par <b>{EDITOR.name}</b>,
        personne physique, à titre non professionnel.
      </p>
      <p>
        TeamNexus est un service <b>gratuit</b>{" "}qui ne tire aucun revenu de son activité : ni abonnement, ni
        publicité, ni revente de données. À ce titre, l&apos;article 6 III 2° de la loi n° 2004-575 du 21 juin
        2004 pour la confiance dans l&apos;économie numérique dispense l&apos;éditeur de publier son adresse
        postale et son immatriculation, sous deux conditions que nous remplissons : ses éléments
        d&apos;identification ont été communiqués à l&apos;hébergeur, et le nom de celui-ci est publié à la
        section 3 ci-dessous. L&apos;autorité judiciaire peut en obtenir communication auprès de
        l&apos;hébergeur.
      </p>
      <p>
        Cette dispense cesserait dès que le service deviendrait professionnel — une offre payante, un
        partenariat rémunéré ou de la publicité suffiraient. Les mentions seraient alors complétées avant
        toute mise en service.
      </p>
      <p>
        Pour nous écrire : <Value of={CONTACT.email} label="adresse électronique de contact" />.
      </p>

      <h2 id="publication">2. Directeurs de la publication</h2>
      <p>
        La responsabilité éditoriale est assumée conjointement par{" "}
        <b>{PUBLICATION_DIRECTORS.join(" et ")}</b>.
      </p>

      <h2 id="hebergeur">3. Hébergeur</h2>
      <p>Le site et l&apos;application sont hébergés par :</p>
      <ul>
        <li>
          Dénomination : <b>{HOST.name}</b>
        </li>
        <li>Adresse : {HOST.address}</li>
        <li>
          Site : <a href="https://www.ionos.fr" rel="noopener">ionos.fr</a>
        </li>
      </ul>
      <p>
        L&apos;hébergeur n&apos;intervient pas dans le contenu publié par les utilisateurs de
        l&apos;application. Les données sont stockées <Value of={HOST.country} label="pays du centre de données" />
        .
      </p>

      <h2 id="propriete">4. Propriété intellectuelle</h2>
      <p>
        La marque TeamNexus, son logo, la charte graphique, les textes de ce site et le code de
        l&apos;application sont la propriété de l&apos;éditeur, sauf mention contraire. Toute reproduction ou
        représentation, totale ou partielle, sans autorisation écrite préalable, est interdite.
      </p>
      <p>
        Les annonces, photographies de profil et autres contenus publiés par les coachs dans
        l&apos;application restent la propriété de leurs auteurs. Voir les{" "}
        <Link href="/cgu">conditions générales d&apos;utilisation</Link>.
      </p>
      <h3>Ressources tierces</h3>
      <p>
        Les caractères typographiques employés — <b>Inter</b> et <b>Barlow Condensed</b>{" "}— sont distribués sous
        licence SIL Open Font License 1.1. Les données d&apos;adresses et de géocodage proviennent de
        l&apos;API Adresse de l&apos;État (
        <a href="https://adresse.data.gouv.fr" rel="noopener">
          adresse.data.gouv.fr
        </a>
        ), diffusée sous licence ouverte.
      </p>

      <h2 id="liens">5. Liens et services tiers</h2>
      <p>
        Ce site ne dépose aucun cookie et n&apos;appelle aucun service tiers : polices, images et scripts sont
        servis depuis son propre domaine. Il ne comporte pas de mesure d&apos;audience.
      </p>
      <p>
        L&apos;application, elle, s&apos;appuie sur deux services extérieurs, décrits dans la{" "}
        <Link href="/confidentialite">politique de confidentialité</Link> : l&apos;API Adresse de l&apos;État
        pour le géocodage, appelée depuis nos serveurs, et le service de notifications push de votre
        navigateur, si vous les activez.
      </p>

      <h2 id="signalement">6. Signaler un contenu illicite</h2>
      <p>
        Une annonce, un nom d&apos;équipe ou une photographie de profil qui vous paraît illicite peut être
        signalé à l&apos;adresse{" "}
        <Value of={CONTACT.abuseEmail ?? CONTACT.email} label="adresse de signalement" />. Indiquez le contenu
        concerné, son auteur si vous le connaissez, et le motif du signalement. Nous retirons sans délai les
        contenus manifestement illicites qui nous sont signalés.
      </p>
      <p>
        Les coachs inscrits disposent en outre d&apos;un canal de signalement directement dans
        l&apos;application. L&apos;adresse ci-dessus reste ouverte à tous, y compris à qui n&apos;a pas de
        compte — c&apos;est la condition pour qu&apos;un signalement puisse venir de n&apos;importe qui.
      </p>

      <h2 id="donnees">7. Données personnelles</h2>
      <p>
        Le traitement des données personnelles est décrit dans une page dédiée :{" "}
        <Link href="/confidentialite">politique de confidentialité</Link>. Vous y trouverez ce qui est
        collecté, pourquoi, pendant combien de temps, et comment exercer vos droits.
      </p>

      <ContactCard title="Nous joindre">
        <p>
          Pour toute question sur ces mentions ou sur le fonctionnement du service :{" "}
          <Value of={CONTACT.email} label="adresse électronique" />.
        </p>
      </ContactCard>
    </LegalPage>
  );
}
