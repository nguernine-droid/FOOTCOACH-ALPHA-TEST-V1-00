import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT, EDITOR, LEGAL_VERSIONS, legalIsComplete } from "@/lib/legal";
import { ContactCard, IncompleteNotice, LegalPage, SummaryBox, Value } from "@/components/public/LegalPage";

const complete = legalIsComplete();

export const metadata: Metadata = {
  title: "Conditions générales d'utilisation",
  description:
    "Ce que TeamNexus fait, ce qu'il ne fait pas à votre place, et ce que nous attendons de vous. La déclaration du match à votre district reste la vôtre.",
  alternates: { canonical: "/cgu" },
  robots: { index: complete, follow: true },
};

const TOC = [
  { id: "objet", label: "Objet" },
  { id: "acceptation", label: "Acceptation" },
  { id: "inscription", label: "Qui peut s'inscrire" },
  { id: "compte", label: "Votre compte" },
  { id: "perimetre", label: "Ce que le service ne fait pas" },
  { id: "engagements", label: "Vos engagements" },
  { id: "contenus", label: "Vos contenus" },
  { id: "scores", label: "Rencontres, scores et points" },
  { id: "disponibilite", label: "Disponibilité" },
  { id: "suspension", label: "Suspension et suppression" },
  { id: "propriete", label: "Propriété intellectuelle" },
  { id: "responsabilite", label: "Responsabilité" },
  { id: "droit", label: "Droit applicable" },
];

export default function Cgu() {
  return (
    <LegalPage
      eyebrow="Règles d'usage"
      title="Conditions générales d'utilisation"
      lede="Ce que le service vous apporte, ce qu'il ne fait pas à votre place, et ce que nous attendons de vous. Écrit pour être lu par un coach, pas seulement par un juriste."
      updated={LEGAL_VERSIONS.cgu.updated}
      version={LEGAL_VERSIONS.cgu.version}
      toc={TOC}
    >
      {!complete && <IncompleteNotice />}

      <SummaryBox title="L'essentiel">
        <ul>
          <li>
            TeamNexus <b>met des coachs en relation</b>. Il n&apos;organise pas la rencontre à votre place.
          </li>
          <li>
            La <b>déclaration du match à votre district reste la vôtre</b>{" "}: l&apos;application ne l&apos;envoie
            pas et ne vérifie pas le délai de dix jours.
          </li>
          <li>
            Licences, assurances, homologation du terrain, arbitrage, encadrement des joueurs :{" "}
            <b>rien de tout cela n&apos;est vérifié</b>{" "}par le service.
          </li>
          <li>
            Le score saisi par l&apos;un des deux coachs est un <b>accord entre vous</b>, sans valeur
            officielle auprès d&apos;une fédération.
          </li>
          <li>
            Vos <b>points</b>{" "}viennent du scan de QR code au stade : ils valent dans le service, et nulle part
            ailleurs.
          </li>
          <li>
            Le service est <b>gratuit</b>{" "}dans sa version 1.
          </li>
        </ul>
      </SummaryBox>

      <h2 id="objet">1. Objet</h2>
      <p>
        Les présentes conditions régissent l&apos;utilisation de l&apos;application TeamNexus et du site
        teamnexus.fr, édités par <b>{EDITOR.name}</b>{" "}(« nous »).
      </p>
      <p>
        TeamNexus est un outil de <b>mise en relation entre coachs</b>{" "}pour l&apos;organisation de matchs
        amicaux et de tournois : publier une annonce, répondre à celle d&apos;un confrère, fixer la rencontre,
        attester au stade qu&apos;elle a bien eu lieu, puis enregistrer le score final.
      </p>

      <h2 id="acceptation">2. Acceptation et modification</h2>
      <p>
        Créer un compte vaut acceptation des présentes conditions. Elles peuvent être modifiées pour suivre
        l&apos;évolution du service ; la date de mise à jour figure en tête de page, et toute modification
        substantielle vous est signalée dans l&apos;application. Continuer à utiliser le service après cette
        information vaut acceptation de la nouvelle version.
      </p>

      <h2 id="inscription">3. Qui peut s&apos;inscrire</h2>
      <p>
        Le service est réservé aux <b>personnes majeures</b>{" "}qui encadrent une ou plusieurs équipes de
        football. En créant un compte, vous déclarez avoir la qualité d&apos;éducateur, d&apos;entraîneur ou de
        responsable d&apos;équipe, et être habilité à engager celle-ci pour un match amical.
      </p>
      <p>
        L&apos;inscription est libre : elle crée votre compte et votre première équipe. Aucun rattachement à un
        club n&apos;est demandé, aucune validation par un tiers n&apos;est requise.
      </p>

      <h2 id="compte">4. Votre compte</h2>
      <ul>
        <li>
          Vous renseignez des <b>informations exactes</b>{" "}et les tenez à jour : un adversaire décide de se
          déplacer sur leur foi.
        </li>
        <li>
          Votre mot de passe est <b>personnel</b>. Vous êtes responsable des actions faites depuis votre compte
          tant que vous n&apos;avez pas signalé sa compromission.
        </li>
        <li>
          Un compte correspond à <b>une personne</b>. Un même coach peut en revanche encadrer plusieurs équipes
          depuis un compte unique.
        </li>
        <li>
          Votre <b>code coach</b>{" "}est à donner à qui vous voulez : le détenir suffit à créer un lien réciproque
          avec vous, et donne accès à votre téléphone si vous l&apos;avez renseigné.
        </li>
      </ul>

      <h2 id="perimetre">5. Ce que le service fait — et ne fait pas</h2>
      <p>
        TeamNexus vous aide à <b>trouver un adversaire et à vous entendre avec lui</b>. Tout ce qui relève de la
        tenue effective du match reste de votre responsabilité et de celle de votre club.
      </p>
      <h3>La déclaration à la fédération</h3>
      <p>
        Un match amical doit être déclaré au district ou à la ligue, en principe <b>au moins dix jours avant</b>{" "}
        la rencontre. Ce délai vous est rappelé ici, à l&apos;acceptation des présentes conditions :
        l&apos;application <b>ne le vérifie pas</b>, ne calcule aucun écart entre la publication et la date du
        match, ne bloque aucune date, et <b>ne transmet rien à votre district</b>. Les dérogations existant, le
        respect de ce délai relève de votre seule appréciation et de celle de votre club.
      </p>
      <h3>Ce qui n&apos;est ni fourni ni vérifié</h3>
      <ul>
        <li>
          La validité des <b>licences</b>{" "}des joueurs et des éducateurs.
        </li>
        <li>
          Les <b>assurances</b>{" "}des personnes, des équipes et des installations.
        </li>
        <li>
          L&apos;<b>homologation du terrain</b>, sa disponibilité réelle, l&apos;accès aux vestiaires.
        </li>
        <li>
          La présence d&apos;un <b>arbitre</b>, d&apos;un secouriste ou d&apos;un défibrillateur.
        </li>
        <li>
          L&apos;<b>identité et la qualité</b>{" "}des personnes inscrites : nous ne contrôlons pas qu&apos;un
          utilisateur est réellement l&apos;éducateur qu&apos;il déclare être.
        </li>
        <li>
          Le <b>transport</b>{" "}des joueurs et l&apos;encadrement des mineurs, qui n&apos;entrent pas dans le
          périmètre du service.
        </li>
      </ul>
      <p>
        Avant de vous déplacer, il vous appartient de vérifier auprès de votre interlocuteur ce qui doit
        l&apos;être.
      </p>

      <h2 id="engagements">6. Vos engagements</h2>
      <ul>
        <li>
          <b>Publier des annonces sincères</b>{" "}: un créneau que vous pouvez tenir, un terrain dont vous
          disposez, une catégorie exacte.
        </li>
        <li>
          <b>Prévenir en cas d&apos;empêchement</b>, par la fonction de désistement prévue, en indiquant le
          motif. Un adversaire prévenu peut relancer une recherche ; un adversaire qui l&apos;apprend le samedi
          matin, non.
        </li>
        <li>
          <b>Respecter vos interlocuteurs</b>{" "}: les échanges relèvent de la correction attendue entre
          éducateurs.
        </li>
        <li>
          Ne pas <b>usurper</b>{" "}l&apos;identité d&apos;un tiers, d&apos;un club ou d&apos;une équipe.
        </li>
        <li>
          Ne pas utiliser le service à des fins de <b>démarchage</b>, de publicité ou de collecte de contacts.
        </li>
        <li>
          Ne pas tenter d&apos;<b>extraire massivement</b>{" "}les données du service, de contourner la validation
          des scores, les limites de débit ou les mécanismes d&apos;authentification.
        </li>
      </ul>

      <h2 id="contenus">7. Vos contenus</h2>
      <p>
        Vous restez propriétaire de ce que vous publiez — annonces, tournois et leur affiche, messages,
        publications d&apos;information, photo de profil, écusson d&apos;équipe. Vous nous accordez le droit de
        les afficher dans le service, aux seules fins de son fonctionnement, pour la durée de leur publication.
      </p>
      <p>
        L&apos;écusson que vous envoyez et le <b>nom de club</b>{" "}que vous déclarez sont vus par les autres
        coachs, et un club déclaré peut être repris par ceux qui y appartiennent : ne déclarez que le club que
        vous encadrez réellement, et n&apos;envoyez un écusson que si vous avez le droit de le diffuser.
      </p>
      <p>
        Vous garantissez disposer des droits sur ce que vous publiez, notamment sur votre photographie. Les
        contenus illicites, injurieux, discriminatoires ou attentatoires à la vie privée d&apos;autrui sont
        interdits et peuvent être retirés sans préavis. Tout contenu peut nous être signalé — voir les{" "}
        <Link href="/mentions-legales#signalement">mentions légales</Link>.
      </p>

      <h2 id="scores">8. Rencontres, scores et points</h2>
      <p>
        Le jour du match, le coach qui reçoit affiche un <b>QR code</b>{" "}que le coach en déplacement scanne sur
        place. Ce scan atteste que les deux équipes se sont bien retrouvées : il ne peut pas se faire à
        distance, et c&apos;est lui qui donne des <b>points</b>{" "}aux deux coachs. Ces points forment un palier,
        visible des autres coachs ; ils n&apos;ont aucune valeur en dehors du service, et deux équipes qui se
        rencontrent souvent cessent d&apos;en gagner pendant trente jours.
      </p>
      <p>
        Le <b>score</b>{" "}final est saisi par l&apos;un ou l&apos;autre coach, sans contre-signature, et reste
        corrigeable par les deux. Il <b>ne constitue pas un résultat officiel</b>{" "}et n&apos;est transmis à
        aucune fédération.
      </p>

      <h2 id="disponibilite">9. Disponibilité et évolutions</h2>
      <p>
        Le service est fourni « en l&apos;état », dans sa version 1, et évolue régulièrement. Nous ne
        garantissons ni disponibilité continue, ni absence d&apos;erreur. Des interruptions peuvent survenir
        pour maintenance, mise à jour ou incident technique. Certaines fonctions dépendent de votre appareil :
        l&apos;appareil photo pour le scan, les notifications sur iPhone lorsque l&apos;application a été
        ajoutée à l&apos;écran d&apos;accueil.
      </p>
      <p>
        Le service est actuellement <b>gratuit</b>. L&apos;introduction d&apos;une offre payante ferait
        l&apos;objet d&apos;une information préalable et de conditions de vente distinctes ; elle ne pourrait
        pas s&apos;appliquer rétroactivement.
      </p>

      <h2 id="suspension">10. Suspension et suppression</h2>
      <p>
        Nous pouvons suspendre ou désactiver un compte en cas de manquement aux présentes conditions, notamment
        d&apos;annonces manifestement fausses, de comportement abusif ou de tentative de contournement des
        mécanismes de sécurité. Sauf urgence ou obligation légale, cette décision vous est notifiée et vous
        pouvez la contester à l&apos;adresse indiquée ci-dessous.
      </p>
      <p>
        Vous pouvez demander la suppression de votre compte à tout moment : voir la{" "}
        <Link href="/confidentialite#droits">politique de confidentialité</Link>. Les matchs déjà joués avec
        d&apos;autres coachs peuvent subsister chez eux, sans vos données personnelles.
      </p>

      <h2 id="propriete">11. Propriété intellectuelle</h2>
      <p>
        La marque, le logo, l&apos;interface et le code de TeamNexus sont protégés. L&apos;accès au service ne
        vous confère qu&apos;un droit d&apos;usage personnel, non exclusif et non transférable, pour la durée de
        votre inscription.
      </p>

      <h2 id="responsabilite">12. Responsabilité</h2>
      <p>
        Notre responsabilité se limite à la fourniture de l&apos;outil de mise en relation. Nous ne sommes pas
        partie à l&apos;accord conclu entre deux coachs, et ne pouvons être tenus responsables de
        l&apos;annulation d&apos;un match, de l&apos;absence d&apos;un adversaire, d&apos;un différend sur un
        score, d&apos;un dommage survenu à l&apos;occasion d&apos;une rencontre, ni du défaut de déclaration
        d&apos;un match à une fédération.
      </p>
      <p>
        Nous restons responsables du bon fonctionnement du service et de la sécurité des données que vous nous
        confiez, dans les conditions décrites dans la{" "}
        <Link href="/confidentialite">politique de confidentialité</Link>.
      </p>

      <h2 id="droit">13. Droit applicable et réclamations</h2>
      <p>
        Les présentes conditions sont soumises au <b>droit français</b>. En cas de difficulté, adressez-nous
        d&apos;abord votre réclamation : <Value of={CONTACT.email} label="adresse électronique" />. Nous nous
        engageons à y répondre. À défaut de solution amiable, le litige relève des juridictions françaises
        compétentes.
      </p>

      <ContactCard title="Une question sur ces conditions">
        <p>
          Écrivez à <Value of={CONTACT.email} label="adresse électronique" />. Une règle qui vous paraît
          injuste ou mal formulée mérite d&apos;être signalée : ces conditions sont faites pour être comprises.
        </p>
      </ContactCard>
    </LegalPage>
  );
}
